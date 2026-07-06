const { spawn } = require('child_process');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper delay function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('==================================================');
  console.log('   Finewise AI - Backend End-to-End Test Suite');
  console.log('==================================================\n');

  // Start the server
  const serverPath = path.resolve(__dirname, 'server.js');
  console.log('Starting Finewise AI server...');
  const server = spawn('node', [serverPath], {
    cwd: __dirname,
    env: { ...process.env, PORT }
  });

  // Handle server output
  server.stdout.on('data', (data) => {
    // console.log(`[Server]: ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data}`);
  });

  // Give the server a moment to boot
  await sleep(3000);

  let clientToken = '';
  let adminToken = '';
  let clientId = null;

  try {
    // Test Case 1: Register Client
    console.log('Test Case 1: Registering new client...');
    const registerClientRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_client_001',
        password: 'ClientPassword123',
        role: 'client'
      })
    });
    const regClientData = await registerClientRes.json();
    console.log('Client registration status:', registerClientRes.status);
    console.log('Client registration output:', regClientData);
    if (registerClientRes.status !== 210 && registerClientRes.status !== 201) {
      if (regClientData.error !== 'Username is already taken.') {
        throw new Error('Client registration failed');
      }
    }

    // Test Case 2: Register Admin
    console.log('\nTest Case 2: Registering new admin...');
    const registerAdminRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_admin_001',
        password: 'AdminPassword123',
        role: 'admin'
      })
    });
    const regAdminData = await registerAdminRes.json();
    console.log('Admin registration status:', registerAdminRes.status);
    console.log('Admin registration output:', regAdminData);
    if (registerAdminRes.status !== 210 && registerAdminRes.status !== 201) {
      if (regAdminData.error !== 'Username is already taken.') {
        throw new Error('Admin registration failed');
      }
    }

    // Test Case 3: Login Client
    console.log('\nTest Case 3: Logging in as client...');
    const loginClientRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_client_001',
        password: 'ClientPassword123',
        role: 'client'
      })
    });
    const loginClientData = await loginClientRes.json();
    console.log('Client login status:', loginClientRes.status);
    if (loginClientRes.status !== 200) {
      throw new Error('Client login failed: ' + JSON.stringify(loginClientData));
    }
    clientToken = loginClientData.token;
    console.log('Client token obtained.');

    // Test Case 4: Login Admin
    console.log('\nTest Case 4: Logging in as admin...');
    const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_admin_001',
        password: 'AdminPassword123',
        role: 'admin'
      })
    });
    const loginAdminData = await loginAdminRes.json();
    console.log('Admin login status:', loginAdminRes.status);
    if (loginAdminRes.status !== 200) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginAdminData));
    }
    adminToken = loginAdminData.token;
    console.log('Admin token obtained.');

    // Test Case 5: Role-based Access Control
    console.log('\nTest Case 5: Testing Role Access Control (Client endpoints as Admin)...');
    const unauthorizedClientCall = await fetch(`${BASE_URL}/api/client/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Access client endpoint with admin token status:', unauthorizedClientCall.status);
    if (unauthorizedClientCall.status !== 403) {
      throw new Error('Access should have been Forbidden (403)');
    }
    console.log('PASSED: Admin blocked from Client endpoints.');

    console.log('Testing Role Access Control (Admin endpoints as Client)...');
    const unauthorizedAdminCall = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    console.log('Access admin endpoint with client token status:', unauthorizedAdminCall.status);
    if (unauthorizedAdminCall.status !== 403) {
      throw new Error('Access should have been Forbidden (403)');
    }
    console.log('PASSED: Client blocked from Admin endpoints.');

    // Test Case 6: Submit Client Profile
    console.log('\nTest Case 6: Submitting financial profile as Client...');
    const submitProfileRes = await fetch(`${BASE_URL}/api/client/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        full_name: 'Test Client User',
        credit_score: 720,
        annual_income: 80000,
        monthly_expenses: 1800,
        requested_loan_amount: 30000,
        loan_purpose: 'Invest in business growth'
      })
    });
    console.log('Submit profile status:', submitProfileRes.status);
    const profileData = await submitProfileRes.json();
    console.log('Submit profile output:', profileData);
    if (submitProfileRes.status !== 200) {
      throw new Error('Profile submission failed');
    }

    // Test Case 7: Link Client Bank Accounts
    console.log('\nTest Case 7: Linking bank account as Client...');
    const submitBankRes = await fetch(`${BASE_URL}/api/client/bank-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        bank_name: 'Chase Bank',
        account_type: 'Checking',
        balance: 6000,
        account_number: '1234567890',
        routing_number: '987654321'
      })
    });
    console.log('Link bank account status:', submitBankRes.status);
    if (submitBankRes.status !== 201) {
      throw new Error('Bank account connection failed');
    }

    // Test Case 8: Link Client Previous Loans
    console.log('\nTest Case 8: Logging previous active loan...');
    const submitLoanRes = await fetch(`${BASE_URL}/api/client/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        lender_name: 'Capital One',
        loan_amount: 15000,
        remaining_balance: 5000,
        monthly_payment: 300,
        status: 'active'
      })
    });
    console.log('Link loan status:', submitLoanRes.status);
    if (submitLoanRes.status !== 201) {
      throw new Error('Loan logger failed');
    }

    // Test Case 9: Fetch Analysis & Validate CWI output
    console.log('\nTest Case 9: Requesting MF-CWI Credit analysis...');
    const analysisRes = await fetch(`${BASE_URL}/api/client/analysis`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    console.log('Fetch analysis status:', analysisRes.status);
    const analysisData = await analysisRes.json();
    console.log('Credit analysis response:', JSON.stringify(analysisData, null, 2));
    
    if (analysisRes.status !== 200) {
      throw new Error('Failed to retrieve analysis');
    }
    if (!analysisData.risk_score || analysisData.approved_amount === undefined) {
      throw new Error('Invalid analysis payload structure');
    }
    console.log('PASSED: CWI Algorithm analysis returned successfully.');

    // Test Case 10: Admin Directory & Data Privacy Verification
    console.log('\nTest Case 10: Admin directory check & privacy assertion...');
    const adminClientsRes = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Admin directory status:', adminClientsRes.status);
    const adminClientsData = await adminClientsRes.json();
    
    if (adminClientsRes.status !== 200) {
      throw new Error('Failed to fetch clients from admin endpoint');
    }

    console.log(`Found ${adminClientsData.length} client record(s) in Admin Directory.`);
    
    // Find our test client
    const targetClient = adminClientsData.find(c => c.username === 'test_client_001');
    if (!targetClient) {
      throw new Error('Test client not found in admin list');
    }

    console.log('Verifying data isolation elements...');
    console.log('Client summary assessment parameters present:');
    console.log('  - Risk Rating Score:', targetClient.risk_score);
    console.log('  - Approved Loan Amount limit:', targetClient.approved_amount);
    console.log('  - Debt-to-Income (DTI) ratio:', targetClient.debt_to_income_ratio);

    // CRITICAL SECURITY ASSERTION
    if (targetClient.account_number || targetClient.routing_number || targetClient.balance !== undefined) {
      throw new Error('SECURITY BREACH: Sensitive raw bank account metrics are visible to the administrator!');
    }
    console.log('PASSED: Raw bank account numbers, routing numbers, and balances are hidden from admin views.');

    console.log('\n==================================================');
    console.log('         ALL BACKEND TESTS PASSED SUCCESS!');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error.message);
  } finally {
    console.log('\nStopping Express test server...');
    server.kill();
    process.exit(0);
  }
}

runTests();
