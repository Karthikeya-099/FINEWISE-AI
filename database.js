const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database file
const dbPath = path.resolve(__dirname, 'finewise.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

// Helper for running queries (INSERT, UPDATE, DELETE)
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        // Resolve with the last inserted ID and the number of rows affected
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Helper for fetching a single row
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Helper for fetching all matching rows
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize database schema (create tables if they don't exist)
const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Enable Foreign Key support in SQLite
      db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) return reject(err);
      });

      // 1. Users Table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('client', 'admin')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) return reject(err);
      });

      // 2. Client Profiles Table
      db.run(`
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
      `, (err) => {
        if (err) return reject(err);
      });

      // 3. Bank Accounts Table
      db.run(`
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
      `, (err) => {
        if (err) return reject(err);
      });

      // 4. Previous Loans Table
      db.run(`
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
      `, (err) => {
        if (err) return reject(err);
      });

      // 5. Loan Analysis Table
      db.run(`
        CREATE TABLE IF NOT EXISTS loan_analysis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          cwi REAL NOT NULL,
          risk_score TEXT NOT NULL,
          approved_amount REAL NOT NULL,
          debt_to_income_ratio REAL NOT NULL,
          interest_rate_offered REAL NOT NULL,
          recommendations TEXT NOT NULL, -- JSON string storage
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `, (err) => {
        if (err) return reject(err);
        else resolve();
      });
    });
  });
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDb
};
