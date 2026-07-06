import os
import datetime
import json
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
import bcrypt
import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from database import init_db, db_run, db_get, db_all
from middleware.auth import token_required, require_role, JWT_SECRET
from services.analysis import run_analysis

# Initialize Flask app
app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# Initialize Groq client
groq_client = None
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("Groq Client initialized successfully.")
    except Exception as e:
        print(f"Warning: Failed to initialize Groq client: {e}")
else:
    print("Warning: GROQ_API_KEY not found in environment. Chatbot will run in offline demo mode.")

# Ensure DB schemas exist
init_db()


# ==========================================
# 1. AUTHENTICATION ENDPOINTS
# ==========================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    if not username or not password or not role:
        return jsonify({'error': 'All fields (username, password, role) are required.'}), 400

    if role not in ('client', 'admin'):
        return jsonify({'error': 'Role must be either client or admin.'}), 400

    try:
        # Check if username is taken
        existing_user = db_get('SELECT * FROM users WHERE username = ?', (username,))
        if existing_user:
            return jsonify({'error': 'Username is already taken.'}), 400

        # Hash password using bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')

        # Insert user
        result = db_run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            (username, hashed_password, role)
        )

        return jsonify({'message': 'User registered successfully.', 'userId': result['id']}), 201
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Failed to register user.'}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    if not username or not password or not role:
        return jsonify({'error': 'Username, password, and role are required.'}), 400

    if role not in ('client', 'admin'):
        return jsonify({'error': 'Invalid role specified.'}), 400

    try:
        user = db_get('SELECT * FROM users WHERE username = ?', (username,))

        if not user:
            error_msg = 'Invalid Client credentials.' if role == 'client' else 'Invalid Administrator credentials.'
            return jsonify({'error': error_msg}), 401

        # Prevent cross-role spoofing
        if user['role'] != role:
            if role == 'client':
                return jsonify({'error': 'Administrator credentials cannot be used in Client Login.'}), 401
            else:
                return jsonify({'error': 'Client credentials cannot be used in Administrator Login.'}), 401

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            error_msg = 'Invalid Client credentials.' if role == 'client' else 'Invalid Administrator credentials.'
            return jsonify({'error': error_msg}), 401

        # Generate JWT
        token_payload = {
            'id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'token': token,
            'role': user['role'],
            'username': user['username']
        })
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Failed to login.'}), 500


# ==========================================
# 2. CLIENT WORKSPACE ENDPOINTS
# ==========================================

def trigger_analysis_update(user_id):
    """Helper to update user analysis results in the background when financial data changes."""
    try:
        profile = db_get('SELECT id FROM client_profiles WHERE user_id = ?', (user_id,))
        if profile:
            run_analysis(user_id)
    except Exception as e:
        print(f"Automatic analysis update failed for user {user_id}: {e}")


@app.route('/api/client/profile', methods=['GET', 'POST'])
@token_required
@require_role('client')
def client_profile():
    user_id = g.user['id']

    if request.method == 'GET':
        try:
            profile = db_get('SELECT * FROM client_profiles WHERE user_id = ?', (user_id,))
            return jsonify(profile)
        except Exception as e:
            print(f"Error fetching profile: {e}")
            return jsonify({'error': 'Failed to fetch financial profile.'}), 500

    # POST route to create or update profile
    data = request.get_json() or {}
    full_name = data.get('full_name')
    credit_score = data.get('credit_score')
    annual_income = data.get('annual_income')
    monthly_expenses = data.get('monthly_expenses')
    requested_loan_amount = data.get('requested_loan_amount')
    loan_purpose = data.get('loan_purpose', '')

    if not full_name or credit_score is None or annual_income is None or monthly_expenses is None or requested_loan_amount is None:
        return jsonify({'error': 'Missing required profile fields.'}), 400

    try:
        score = int(credit_score)
    except ValueError:
        return jsonify({'error': 'Credit score must be a number.'}), 400

    if score < 300 or score > 850:
        return jsonify({'error': 'Credit score must be between 300 and 850.'}), 400

    try:
        existing_profile = db_get('SELECT id FROM client_profiles WHERE user_id = ?', (user_id,))

        if existing_profile:
            db_run(
                """UPDATE client_profiles 
                   SET full_name = ?, credit_score = ?, annual_income = ?, monthly_expenses = ?, requested_loan_amount = ?, loan_purpose = ?
                   WHERE user_id = ?""",
                (full_name, score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose, user_id)
            )
        else:
            db_run(
                """INSERT INTO client_profiles (user_id, full_name, credit_score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (user_id, full_name, score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose)
            )

        # Update scoring analysis
        trigger_analysis_update(user_id)

        return jsonify({'message': 'Financial profile saved successfully.'})
    except Exception as e:
        print(f"Error saving profile: {e}")
        return jsonify({'error': 'Failed to save profile.'}), 500


@app.route('/api/client/bank-accounts', methods=['GET', 'POST'])
@token_required
@require_role('client')
def client_bank_accounts():
    user_id = g.user['id']

    if request.method == 'GET':
        try:
            accounts = db_all(
                'SELECT id, bank_name, account_number, account_type, balance, routing_number, created_at FROM bank_accounts WHERE user_id = ?',
                (user_id,)
            )
            return jsonify(accounts)
        except Exception as e:
            print(f"Error fetching bank accounts: {e}")
            return jsonify({'error': 'Failed to fetch bank accounts.'}), 500

    # POST route to add a bank account
    data = request.get_json() or {}
    bank_name = data.get('bank_name')
    account_number = data.get('account_number')
    account_type = data.get('account_type')
    balance = data.get('balance')
    routing_number = data.get('routing_number')

    if not bank_name or not account_number or not account_type or balance is None or not routing_number:
        return jsonify({'error': 'All bank account details are required.'}), 400

    try:
        db_run(
            """INSERT INTO bank_accounts (user_id, bank_name, account_number, account_type, balance, routing_number)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, bank_name, account_number, account_type, balance, routing_number)
        )

        # Trigger analysis refresh
        trigger_analysis_update(user_id)

        return jsonify({'message': 'Bank account added successfully.'}), 201
    except Exception as e:
        print(f"Error adding bank account: {e}")
        return jsonify({'error': 'Failed to add bank account.'}), 500


@app.route('/api/client/loans', methods=['GET', 'POST'])
@token_required
@require_role('client')
def client_loans():
    user_id = g.user['id']

    if request.method == 'GET':
        try:
            loans = db_all('SELECT * FROM previous_loans WHERE user_id = ?', (user_id,))
            return jsonify(loans)
        except Exception as e:
            print(f"Error fetching previous loans: {e}")
            return jsonify({'error': 'Failed to fetch previous loans.'}), 500

    # POST route to log a loan liability
    data = request.get_json() or {}
    lender_name = data.get('lender_name')
    loan_amount = data.get('loan_amount')
    remaining_balance = data.get('remaining_balance')
    monthly_payment = data.get('monthly_payment')
    status = data.get('status')

    if not lender_name or loan_amount is None or remaining_balance is None or monthly_payment is None or not status:
        return jsonify({'error': 'All loan details are required.'}), 400

    if status not in ('active', 'paid'):
        return jsonify({'error': 'Loan status must be active or paid.'}), 400

    try:
        db_run(
            """INSERT INTO previous_loans (user_id, lender_name, loan_amount, remaining_balance, monthly_payment, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, lender_name, loan_amount, remaining_balance, monthly_payment, status)
        )

        # Trigger analysis refresh
        trigger_analysis_update(user_id)

        return jsonify({'message': 'Previous loan detail added successfully.'}), 201
    except Exception as e:
        print(f"Error adding previous loan: {e}")
        return jsonify({'error': 'Failed to add previous loan.'}), 500


@app.route('/api/client/analysis', methods=['GET'])
@token_required
@require_role('client')
def client_analysis():
    user_id = g.user['id']

    try:
        analysis = db_get('SELECT * FROM loan_analysis WHERE user_id = ?', (user_id,))

        # If analysis does not exist but client profile is present, compute it now
        if not analysis:
            profile = db_get('SELECT id FROM client_profiles WHERE user_id = ?', (user_id,))
            if profile:
                analysis = run_analysis(user_id)
            else:
                return jsonify({'error': 'Please complete your financial profile first to generate analysis.'}), 400
        else:
            analysis['recommendations'] = json.loads(analysis['recommendations'])

        return jsonify(analysis)
    except Exception as e:
        print(f"Error fetching analysis: {e}")
        return jsonify({'error': str(e) or 'Failed to fetch analysis.'}), 500


# ==========================================
# 3. [NEW] Personal AI Chatbot Endpoint (Groq)
# ==========================================

@app.route('/api/client/chat', methods=['POST'])
@token_required
@require_role('client')
def client_chat():
    user_id = g.user['id']
    data = request.get_json() or {}
    message = data.get('message')

    if not message:
        return jsonify({'error': 'Message is required.'}), 400

    # Ensure Groq API client is active
    if not groq_client:
        return jsonify({
            'response': "Hi! I am your **Finewise AI Chatbot Advisor**. I can see you linked some accounts, but the **GROQ_API_KEY** is not configured on this server. To make me fully personal, please add `GROQ_API_KEY` to your `.env` file and restart Flask!"
        })

    try:
        # Fetch client's complete financial profile context
        profile = db_get('SELECT * FROM client_profiles WHERE user_id = ?', (user_id,))
        bank_accounts = db_all('SELECT * FROM bank_accounts WHERE user_id = ?', (user_id,))
        previous_loans = db_all('SELECT * FROM previous_loans WHERE user_id = ?', (user_id,))
        analysis = db_get('SELECT * FROM loan_analysis WHERE user_id = ?', (user_id,))

        # Build context details
        profile_info = f"Name: {profile['full_name']}, Credit Score: {profile['credit_score']}, Income: ${profile['annual_income']}/yr, Monthly Expenses: ${profile['monthly_expenses']}/mo" if profile else "No profile submitted yet."
        reserves_info = ", ".join([f"{acc['bank_name']} ({acc['account_type']}): ${acc['balance']}" for acc in bank_accounts]) if bank_accounts else "No bank accounts linked."
        obligations_info = ", ".join([f"{loan['lender_name']} ({loan['status']}): Bal ${loan['remaining_balance']}, Pay ${loan['monthly_payment']}/mo" for loan in previous_loans]) if previous_loans else "No previous loans."
        
        analysis_info = ""
        if analysis:
            analysis_info = f"CWI Index: {analysis['cwi']}, Risk Tier: {analysis['risk_score']}, Approved Limit: ${analysis['approved_amount']}, Debt-to-Income (DTI): {round(analysis['debt_to_income_ratio']*100, 2)}%, Proposed APR: {analysis['interest_rate_offered']}%"
        else:
            analysis_info = "Analysis has not been calculated yet."

        system_prompt = (
            "You are Finewise AI, an expert AI Financial Advisor and Credit Risk Specialist. "
            "You provide highly professional, helpful, and realistic financial advice to clients. "
            "Here is the client's current financial information:\n"
            f"- User Profile: {profile_info}\n"
            f"- Linked Bank Balances: {reserves_info}\n"
            f"- Active Debt Liabilities: {obligations_info}\n"
            f"- Credit Analysis (MF-CWI): {analysis_info}\n\n"
            "Use this data to answer their questions contextually. If they have missing details, encourage "
            "them to link their bank accounts or fill out their profile to improve recommendations. "
            "Keep your responses concise, structured (using Markdown), and highly encouraging."
        )

        model_name = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
        completion = groq_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=1024
        )

        ai_response = completion.choices[0].message.content
        return jsonify({'response': ai_response})

    except Exception as e:
        print(f"Groq Chatbot Error: {e}")
        return jsonify({'error': 'Failed to communicate with AI Advisor.', 'details': str(e)}), 500


# ==========================================
# 4. ADMIN DASHBOARD ENDPOINTS
# ==========================================

@app.route('/api/admin/clients', methods=['GET'])
@token_required
@require_role('admin')
def admin_clients():
    try:
        clients = db_all("""
            SELECT 
                u.id AS user_id,
                u.username,
                cp.full_name,
                cp.credit_score,
                cp.annual_income,
                cp.monthly_expenses,
                cp.requested_loan_amount,
                cp.loan_purpose,
                la.risk_score,
                la.approved_amount,
                la.cwi,
                la.debt_to_income_ratio,
                la.interest_rate_offered,
                la.recommendations
            FROM users u
            LEFT JOIN client_profiles cp ON u.id = cp.user_id
            LEFT JOIN loan_analysis la ON u.id = la.user_id
            WHERE u.role = 'client'
            ORDER BY u.created_at DESC
        """)

        # Parse recommendations for each client
        for client in clients:
            if client.get('recommendations'):
                try:
                    client['recommendations'] = json.loads(client['recommendations'])
                except Exception:
                    client['recommendations'] = []
            else:
                client['recommendations'] = None

        return jsonify(clients)
    except Exception as e:
        print(f"Error fetching admin client list: {e}")
        return jsonify({'error': 'Failed to retrieve clients directories.'}), 500


@app.route('/api/admin/clients/<int:client_id>/analysis', methods=['GET'])
@token_required
@require_role('admin')
def admin_client_analysis(client_id):
    try:
        client_profile = db_get("""
            SELECT 
                u.id AS user_id, 
                u.username, 
                cp.full_name, 
                cp.credit_score, 
                cp.annual_income, 
                cp.monthly_expenses, 
                cp.requested_loan_amount, 
                cp.loan_purpose 
            FROM users u
            LEFT JOIN client_profiles cp ON u.id = cp.user_id
            WHERE u.id = ? AND u.role = 'client'
        """, (client_id,))

        if not client_profile:
            return jsonify({'error': 'Client not found.'}), 404

        analysis = db_get('SELECT * FROM loan_analysis WHERE user_id = ?', (client_id,))
        if analysis:
            analysis['recommendations'] = json.loads(analysis['recommendations'])

        return jsonify({
            'profile': client_profile,
            'analysis': analysis or None
        })
    except Exception as e:
        print(f"Error fetching client details: {e}")
        return jsonify({'error': 'Failed to retrieve client details.'}), 500


# ==========================================
# 5. STATIC FILES & FALLBACK ROUTES
# ==========================================

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    # If the file exists in the public directory, serve it
    if os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    # Otherwise fallback to index.html (client-side routing fallback)
    return app.send_static_file('index.html')

@app.errorhandler(404)
def handle_404(e):
    # API endpoints should return JSON 404
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Resource not found.'}), 404
    # All other frontend paths serve index.html
    return app.send_static_file('index.html')


# ==========================================
# START APPLICATION SERVER
# ==========================================

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3000))
    print(f"==================================================")
    print(f"Finewise AI Python/Flask Server running on port {PORT}")
    print(f"Access the application at: http://localhost:{PORT}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=PORT, debug=True)
