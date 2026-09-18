require('dotenv').config();
const { connectDb, mongoose } = require('./database');
const {
  User,
  ClientProfile,
  BankAccount,
  PreviousLoan,
  LoanAnalysis,
  PasswordResetRequest,
  AuditLog
} = require('./models');

async function inspectDb() {
  console.log('--- MongoDB Finewise Database Inspector ---');
  try {
    await connectDb();

    console.log('\n[1. Users]');
    const users = await User.find().select('username role createdAt');
    console.log(JSON.stringify(users, null, 2));

    console.log('\n[2. Client Profiles]');
    const profiles = await ClientProfile.find();
    console.log(JSON.stringify(profiles, null, 2));

    console.log('\n[3. Bank Accounts]');
    const accounts = await BankAccount.find();
    console.log(JSON.stringify(accounts, null, 2));

    console.log('\n[4. Previous Loans]');
    const loans = await PreviousLoan.find();
    console.log(JSON.stringify(loans, null, 2));

    console.log('\n[5. Loan Analysis]');
    const analysis = await LoanAnalysis.find();
    console.log(JSON.stringify(analysis, null, 2));

    console.log('\n[6. Password Reset Requests]');
    const requests = await PasswordResetRequest.find();
    console.log(JSON.stringify(requests, null, 2));

    console.log('\n[7. Audit Logs]');
    const auditLogs = await AuditLog.find().limit(10);
    console.log(JSON.stringify(auditLogs, null, 2));

  } catch (err) {
    console.error('Inspect DB Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

inspectDb();
