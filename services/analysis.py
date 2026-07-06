import math
import json
from database import db_get, db_all, db_run

def run_analysis(user_id):
    """Multi-Factor Creditworthiness Index (MF-CWI) Algorithm.
    Evaluates credit risk, interest rate, and max approved amount based on 5 dimensions.
    """
    # 1. Fetch data
    profile = db_get('SELECT * FROM client_profiles WHERE user_id = ?', (user_id,))
    if not profile:
        raise ValueError('Client profile not found. Complete profile details first.')

    bank_accounts = db_all('SELECT * FROM bank_accounts WHERE user_id = ?', (user_id,))
    previous_loans = db_all('SELECT * FROM previous_loans WHERE user_id = ?', (user_id,))

    credit_score = profile.get('credit_score', 300)
    annual_income = profile.get('annual_income', 0.0)
    monthly_expenses = profile.get('monthly_expenses', 0.0)
    requested_loan_amount = profile.get('requested_loan_amount', 0.0)

    # 2. Calculations
    monthly_income = annual_income / 12.0 if annual_income > 0 else 0.0

    total_active_monthly_loan_payments = 0.0
    total_remaining_balance = 0.0
    total_original_loan_amount = 0.0

    for loan in previous_loans:
        if loan.get('status') == 'active':
            total_active_monthly_loan_payments += loan.get('monthly_payment', 0.0)
            total_remaining_balance += loan.get('remaining_balance', 0.0)
            total_original_loan_amount += loan.get('loan_amount', 0.0)

    total_reserves = sum(acc.get('balance', 0.0) for acc in bank_accounts)

    # Calculate Debt-to-Income (DTI)
    dti = (monthly_expenses + total_active_monthly_loan_payments) / monthly_income if monthly_income > 0 else 1.0

    # --- Step A: Normalization of Inputs (0 to 1) ---
    # 1. Credit Score (300 to 850)
    s_credit = max(0.0, min(1.0, (credit_score - 300.0) / (850.0 - 300.0)))

    # 2. DTI Score (0 to 60% mapped to 1 to 0)
    s_dti = max(0.0, min(1.0, 1.0 - (dti / 0.60)))

    # 3. Expense-to-Income Score (lower is better, mapped to 0 to 1)
    expense_ratio = monthly_expenses / monthly_income if monthly_income > 0 else 1.0
    s_exp = max(0.0, min(1.0, 1.0 - expense_ratio))

    # 4. Reserves Score (liquid cash vs 3 months of expenses)
    reserve_threshold = max(1000.0, monthly_expenses * 3.0)
    s_res = max(0.0, min(1.0, total_reserves / reserve_threshold))

    # 5. Loan History Score
    s_history = 1.0
    if total_original_loan_amount > 0:
        s_history = max(0.0, min(1.0, 1.0 - (total_remaining_balance / total_original_loan_amount)))

    # --- Step B: Weighted CWI Calculation ---
    cwi = (0.40 * s_credit) + (0.25 * s_dti) + (0.15 * s_exp) + (0.10 * s_res) + (0.10 * s_history)

    # --- Step C: Risk Tiering ---
    risk_score = 'High'
    if cwi >= 0.75:
        risk_score = 'Low'
    elif cwi >= 0.50:
        risk_score = 'Medium'

    # --- Step D: Risk-Adjusted Interest Rate (ROI) ---
    base_rate = 0.045
    risk_premium = 0.15
    roi = base_rate + (1.0 - cwi) * risk_premium

    # --- Step E: Approved Loan Amount Calculation ---
    dti_threshold = 0.30
    if credit_score >= 750:
        dti_threshold = 0.45
    elif credit_score >= 650:
        dti_threshold = 0.38

    max_monthly_payment_allowed = (monthly_income * (dti_threshold * cwi)) - total_active_monthly_loan_payments

    approved_amount = 0.0
    if max_monthly_payment_allowed > 0:
        n = 60
        r = roi / 12.0  # monthly rate
        # Amortization: P = PMT * (1 - (1 + r)^-n) / r
        approved_amount = max_monthly_payment_allowed * (1.0 - math.pow(1.0 + r, -n)) / r

        # Cap at 3x annual income or $250,000 maximum
        cap = min(annual_income * 3.0, 250000.0)
        if approved_amount > cap:
            approved_amount = cap

        # Round to nearest hundred
        approved_amount = round(approved_amount / 100.0) * 100.0

    # --- Step F: Bank Recommendation Matching ---
    bank_policies = [
        {
            'bank': 'Chase Premier Personal',
            'minCreditScore': 720,
            'maxDti': 0.38,
            'baseInterest': 0.0599,
            'maxAmount': 150000,
            'termMonths': 60,
            'description': 'Excellent rates for borrowers with strong credit scores and lower DTI ratio.'
        },
        {
            'bank': 'Bank of America Standard',
            'minCreditScore': 660,
            'maxDti': 0.43,
            'baseInterest': 0.0749,
            'maxAmount': 80000,
            'termMonths': 60,
            'description': 'Competitive options with moderate credit and stable income.'
        },
        {
            'bank': 'Wells Fargo Personal',
            'minCreditScore': 620,
            'maxDti': 0.48,
            'baseInterest': 0.0999,
            'maxAmount': 50000,
            'termMonths': 48,
            'description': 'Flexible terms suited for clients consolidating debts.'
        },
        {
            'bank': 'Capital One Starter',
            'minCreditScore': 580,
            'maxDti': 0.50,
            'baseInterest': 0.1349,
            'maxAmount': 25000,
            'termMonths': 36,
            'description': 'Ideal for establishing credit or shorter term small personal loans.'
        }
    ]

    recommendations = []
    for policy in bank_policies:
        if credit_score >= policy['minCreditScore'] and dti <= policy['maxDti']:
            # Adjust interest rate based on client's CWI
            adjusted_rate = policy['baseInterest'] + (1.0 - cwi) * 0.05
            final_rate = min(adjusted_rate, policy['baseInterest'] + 0.06)

            # Estimate monthly payment
            loan_target = min(policy['maxAmount'], requested_loan_amount, approved_amount or requested_loan_amount)
            mr = final_rate / 12.0
            mt = policy['termMonths']
            est_payment = 0.0
            if loan_target > 0 and mr > 0:
                est_payment = (loan_target * mr) / (1.0 - math.pow(1.0 + mr, -mt))

            recommendations.append({
                'bankName': policy['bank'],
                'offeredRate': round(final_rate * 100.0, 2),
                'maxAmount': policy['maxAmount'],
                'termMonths': policy['termMonths'],
                'estimatedMonthlyPayment': round(est_payment, 2),
                'description': policy['description']
            })

    recommendations.sort(key=lambda x: x['offeredRate'])

    # 3. Save / Update analysis in database
    existing_analysis = db_get('SELECT id FROM loan_analysis WHERE user_id = ?', (user_id,))
    rec_string = json.dumps(recommendations)
    rounded_dti = round(dti, 4)
    rounded_roi = round(roi * 100.0, 2)
    rounded_approved = float(approved_amount)
    rounded_cwi = round(cwi, 4)

    if existing_analysis:
        db_run(
            """UPDATE loan_analysis 
               SET cwi = ?, risk_score = ?, approved_amount = ?, debt_to_income_ratio = ?, interest_rate_offered = ?, recommendations = ?, created_at = CURRENT_TIMESTAMP
               WHERE user_id = ?""",
            (rounded_cwi, risk_score, rounded_approved, rounded_dti, rounded_roi, rec_string, user_id)
        )
    else:
        db_run(
            """INSERT INTO loan_analysis (user_id, cwi, risk_score, approved_amount, debt_to_income_ratio, interest_rate_offered, recommendations)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, rounded_cwi, risk_score, rounded_approved, rounded_dti, rounded_roi, rec_string)
        )

    return {
        'userId': user_id,
        'cwi': rounded_cwi,
        'riskScore': risk_score,
        'approvedAmount': rounded_approved,
        'debtToIncomeRatio': rounded_dti,
        'interestRateOffered': rounded_roi,
        'recommendations': recommendations
    }
