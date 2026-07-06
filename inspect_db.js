const { dbAll } = require('./database');

async function showDatabaseContents() {
  try {
    console.log('==================================================');
    console.log('         FINEWISE AI - DATABASE DUMP');
    console.log('==================================================\n');

    // 1. Users Table
    const users = await dbAll("SELECT id, username, role, created_at FROM users");
    console.log(`[USERS TABLE] - Total Rows: ${users.length}`);
    console.table(users);
    console.log('\n--------------------------------------------------\n');

    // 2. Client Profiles Table
    const profiles = await dbAll("SELECT * FROM client_profiles");
    console.log(`[CLIENT PROFILES TABLE] - Total Rows: ${profiles.length}`);
    console.table(profiles);
    console.log('\n--------------------------------------------------\n');

    // 3. Bank Accounts Table
    const accounts = await dbAll("SELECT * FROM bank_accounts");
    console.log(`[BANK ACCOUNTS TABLE] - Total Rows: ${accounts.length}`);
    console.table(accounts);
    console.log('\n--------------------------------------------------\n');

    // 4. Previous Loans Table
    const loans = await dbAll("SELECT * FROM previous_loans");
    console.log(`[PREVIOUS LOANS TABLE] - Total Rows: ${loans.length}`);
    console.table(loans);
    console.log('\n--------------------------------------------------\n');

    // 5. Loan Analysis Table
    const analysis = await dbAll("SELECT id, user_id, cwi, risk_score, approved_amount, debt_to_income_ratio, interest_rate_offered FROM loan_analysis");
    console.log(`[LOAN ANALYSIS TABLE] - Total Rows: ${analysis.length}`);
    console.table(analysis);
    console.log('\n==================================================');

  } catch (err) {
    console.error('Error reading SQLite tables:', err.message);
  } finally {
    process.exit(0);
  }
}

showDatabaseContents();
