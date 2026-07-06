import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'finewise.db')

def get_db_connection():
    """Create a new SQLite connection and configure it to return dictionary-like rows."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute('PRAGMA foreign_keys = ON;')
    return conn

def db_run(sql, params=()):
    """Run an INSERT, UPDATE, or DELETE query.
    Returns a dict with 'id' (lastrowid) and 'changes' (rowcount).
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return {
            'id': cursor.lastrowid,
            'changes': cursor.rowcount
        }

def db_get(sql, params=()):
    """Fetch a single row from the database. Returns a dict or None."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def db_all(sql, params=()):
    """Fetch all rows matching the query. Returns a list of dicts."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def init_db():
    """Create all required tables if they don't exist yet."""
    with get_db_connection() as conn:
        # 1. Users Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('client', 'admin')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Client Profiles Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS client_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                credit_score INTEGER NOT NULL CHECK(credit_score >= 300 AND credit_score <= 850),
                annual_income REAL NOT NULL CHECK(annual_income >= 0),
                monthly_expenses REAL NOT NULL CHECK(monthly_expenses >= 0),
                requested_loan_amount REAL NOT NULL CHECK(requested_loan_amount >= 0),
                loan_purpose TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # 3. Bank Accounts Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                bank_name TEXT NOT NULL,
                account_number TEXT NOT NULL,
                account_type TEXT NOT NULL,
                balance REAL NOT NULL,
                routing_number TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # 4. Previous Loans Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS previous_loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                lender_name TEXT NOT NULL,
                loan_amount REAL NOT NULL,
                remaining_balance REAL NOT NULL,
                monthly_payment REAL NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('active', 'paid')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # 5. Loan Analysis Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS loan_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                cwi REAL NOT NULL,
                risk_score TEXT NOT NULL,
                approved_amount REAL NOT NULL,
                debt_to_income_ratio REAL NOT NULL,
                interest_rate_offered REAL NOT NULL,
                recommendations TEXT NOT NULL, -- JSON string
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        conn.commit()
    print("SQLite Database initialized successfully.")
