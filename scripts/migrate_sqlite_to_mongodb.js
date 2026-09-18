require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { connectDb, mongoose } = require('../database');
const {
  User,
  ClientProfile,
  BankAccount,
  PreviousLoan,
  LoanAnalysis,
  PasswordResetRequest,
  AuditLog
} = require('../models');

const sqliteDbPath = path.resolve(__dirname, '..', 'finewise.db');

const sqliteAll = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

async function runMigration() {
  console.log('==================================================');
  console.log('  Finewise AI - SQLite to MongoDB Migration Tool');
  console.log('==================================================\n');

  if (!fs.existsSync(sqliteDbPath)) {
    console.log(`[Info] No SQLite database found at: ${sqliteDbPath}`);
    console.log('[Info] Migration skipped. Starting with a fresh MongoDB database.');
    return;
  }

  console.log(`[1/5] Opening SQLite database from: ${sqliteDbPath}`);
  const sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY);

  console.log('[2/5] Connecting to MongoDB...');
  await connectDb();

  try {
    // 1. Migrate Users
    console.log('\n[3/5] Migrating Users table...');
    const sqliteUsers = await sqliteAll(sqliteDb, 'SELECT * FROM users');
    const userIdMap = new Map(); // SQLite user_id -> MongoDB _id

    for (const u of sqliteUsers) {
      let mongoUser = await User.findOne({ username: u.username });
      if (!mongoUser) {
        mongoUser = await User.create({
          username: u.username,
          password: u.password,
          role: u.role,
          createdAt: u.created_at ? new Date(u.created_at) : new Date()
        });
        console.log(`  + Migrated user: @${u.username} (${u.role})`);
      } else {
        console.log(`  = User @${u.username} already exists in MongoDB.`);
      }
      userIdMap.set(u.id, mongoUser._id);
    }
    console.log(`✓ Processed ${sqliteUsers.length} user records.`);

    // 2. Migrate Client Profiles
    console.log('\n[4/5] Migrating Client Profiles & Financial Data...');
    const sqliteProfiles = await sqliteAll(sqliteDb, 'SELECT * FROM client_profiles');
    for (const p of sqliteProfiles) {
      const mongoUserId = userIdMap.get(p.user_id);
      if (mongoUserId) {
        await ClientProfile.findOneAndUpdate(
          { userId: mongoUserId },
          {
            userId: mongoUserId,
            full_name: p.full_name,
            credit_score: p.credit_score,
            annual_income: p.annual_income,
            monthly_expenses: p.monthly_expenses,
            requested_loan_amount: p.requested_loan_amount,
            loan_purpose: p.loan_purpose || '',
            createdAt: p.created_at ? new Date(p.created_at) : new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log(`✓ Processed ${sqliteProfiles.length} client profile records.`);

    // 3. Migrate Bank Accounts
    const sqliteBankAccounts = await sqliteAll(sqliteDb, 'SELECT * FROM bank_accounts');
    for (const b of sqliteBankAccounts) {
      const mongoUserId = userIdMap.get(b.user_id);
      if (mongoUserId) {
        const existing = await BankAccount.findOne({
          userId: mongoUserId,
          account_number: b.account_number
        });
        if (!existing) {
          await BankAccount.create({
            userId: mongoUserId,
            bank_name: b.bank_name,
            account_number: b.account_number,
            account_type: b.account_type,
            balance: b.balance,
            routing_number: b.routing_number,
            createdAt: b.created_at ? new Date(b.created_at) : new Date()
          });
        }
      }
    }
    console.log(`✓ Processed ${sqliteBankAccounts.length} bank account records.`);

    // 4. Migrate Previous Loans
    const sqliteLoans = await sqliteAll(sqliteDb, 'SELECT * FROM previous_loans');
    for (const l of sqliteLoans) {
      const mongoUserId = userIdMap.get(l.user_id);
      if (mongoUserId) {
        const existing = await PreviousLoan.findOne({
          userId: mongoUserId,
          lender_name: l.lender_name,
          loan_amount: l.loan_amount
        });
        if (!existing) {
          await PreviousLoan.create({
            userId: mongoUserId,
            lender_name: l.lender_name,
            loan_amount: l.loan_amount,
            remaining_balance: l.remaining_balance,
            monthly_payment: l.monthly_payment,
            status: l.status,
            createdAt: l.created_at ? new Date(l.created_at) : new Date()
          });
        }
      }
    }
    console.log(`✓ Processed ${sqliteLoans.length} previous loan records.`);

    // 5. Migrate Loan Analysis
    const sqliteAnalysis = await sqliteAll(sqliteDb, 'SELECT * FROM loan_analysis');
    for (const la of sqliteAnalysis) {
      const mongoUserId = userIdMap.get(la.user_id);
      if (mongoUserId) {
        let recs = [];
        try {
          recs = JSON.parse(la.recommendations);
        } catch (e) {
          recs = [];
        }
        await LoanAnalysis.findOneAndUpdate(
          { userId: mongoUserId },
          {
            userId: mongoUserId,
            cwi: la.cwi,
            risk_score: la.risk_score,
            approved_amount: la.approved_amount,
            debt_to_income_ratio: la.debt_to_income_ratio,
            interest_rate_offered: la.interest_rate_offered,
            recommendations: recs,
            createdAt: la.created_at ? new Date(la.created_at) : new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log(`✓ Processed ${sqliteAnalysis.length} loan analysis records.`);

    // 6. Migrate Password Reset Requests
    const sqliteResetRequests = await sqliteAll(sqliteDb, 'SELECT * FROM password_reset_requests');
    for (const pr of sqliteResetRequests) {
      const mongoUserId = userIdMap.get(pr.user_id);
      const mongoResolvedBy = pr.resolved_by ? userIdMap.get(pr.resolved_by) : null;
      if (mongoUserId) {
        await PasswordResetRequest.create({
          userId: mongoUserId,
          username: pr.username,
          role: pr.role,
          status: pr.status,
          temp_password_or_token: pr.temp_password_or_token,
          notes: pr.notes,
          resolved_by: mongoResolvedBy,
          resolved_at: pr.resolved_at ? new Date(pr.resolved_at) : null,
          createdAt: pr.created_at ? new Date(pr.created_at) : new Date()
        });
      }
    }
    console.log(`✓ Processed ${sqliteResetRequests.length} reset request records.`);

    // 7. Migrate Audit Logs
    const sqliteLogs = await sqliteAll(sqliteDb, 'SELECT * FROM audit_logs');
    for (const log of sqliteLogs) {
      const mongoActorId = log.actor_id ? userIdMap.get(log.actor_id) : null;
      const mongoTargetId = log.target_user_id ? userIdMap.get(log.target_user_id) : null;

      await AuditLog.create({
        actor_id: mongoActorId,
        actor_username: log.actor_username,
        actor_role: log.actor_role,
        action: log.action,
        target_user_id: mongoTargetId,
        target_username: log.target_username,
        status: log.status,
        details: log.details,
        createdAt: log.created_at ? new Date(log.created_at) : new Date()
      });
    }
    console.log(`✓ Processed ${sqliteLogs.length} audit log records.`);

    console.log('\n[5/5] 🎉 SQLite to MongoDB Migration Completed Successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    sqliteDb.close();
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
