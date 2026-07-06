const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'finewise.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper functions for async/await
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize tables
const initDb = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('client', 'admin')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS client_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      credit_score INTEGER NOT NULL,
      annual_income REAL NOT NULL,
      monthly_expenses REAL NOT NULL,
      requested_loan_amount REAL NOT NULL,
      loan_purpose TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_type TEXT NOT NULL,
      balance REAL NOT NULL,
      routing_number TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS previous_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lender_name TEXT NOT NULL,
      loan_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      monthly_payment REAL NOT NULL,
      status TEXT CHECK(status IN ('active', 'paid')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS loan_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      cwi REAL,
      risk_score TEXT NOT NULL,
      approved_amount REAL NOT NULL,
      debt_to_income_ratio REAL NOT NULL,
      interest_rate_offered REAL NOT NULL,
      recommendations TEXT NOT NULL, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await dbRun('ALTER TABLE loan_analysis ADD COLUMN cwi REAL');
    console.log('Migration: Added cwi column to loan_analysis table.');
  } catch (err) {
    // Ignore if column already exists
  }

  console.log('Database tables initialized successfully.');
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDb
};
