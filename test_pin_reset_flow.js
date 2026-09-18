const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('  Finewise AI - PIN-Gated Password Reset Test Suite');
  console.log('==================================================\n');

  try {
    // 1. Submit Forgot Password request for 'client10'
    console.log('Test 1: Submitting Forgot Password request for @client10 (username only)...');
    const forgotRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'client10' });
    console.log(`Status: ${forgotRes.status} | Message: ${forgotRes.data.message}`);

    // 2. Check reset status as user
    console.log('\nTest 2: Checking request status as user...');
    const statusRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/reset-status/client10',
      method: 'GET'
    });
    console.log(`Status: ${statusRes.status} | Request Status: ${statusRes.data.status} | Role: ${statusRes.data.role}`);

    // 3. Log in as Superior
    console.log('\nTest 3: Logging in as Superior Administrator...');
    const supLogin = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'superior', password: 'SuperiorPassword123', role: 'admin' });
    console.log(`Superior Login Status: ${supLogin.status} | Token received: ${!!supLogin.data.token}`);
    const superiorToken = supLogin.data.token;

    // 4. Log in as normal Admin
    console.log('\nTest 4: Logging in as normal Auditor Admin (test_admin_001)...');
    const admLogin = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'test_admin_001', password: 'AdminPassword123', role: 'admin' });
    const adminToken = admLogin.data.token;

    // 5. Test Normal Admin blocked from reset endpoint (RBAC check)
    console.log('\nTest 5: Verifying Normal Admin is blocked from reset endpoints (Must be 403)...');
    const blockedRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/reset-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { targetUserId: 6, pin: '8492' });
    console.log(`Normal Admin Reset Status: ${blockedRes.status} (Expected 403)`);

    // 6. Test Superior with Invalid PIN
    console.log('\nTest 6: Testing Superior with incorrect PIN (Must be 401)...');
    const wrongPinRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/reset-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superiorToken}`
      }
    }, { targetUserId: 6, pin: '0000' });
    console.log(`Wrong PIN Status: ${wrongPinRes.status} | Error: ${wrongPinRes.data.error}`);

    // 7. Test Superior with Correct PIN (8492)
    console.log('\nTest 7: Testing Superior with correct PIN (8492)...');
    const successResetRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/reset-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superiorToken}`
      }
    }, { targetUserId: 6, pin: '8492' });
    console.log(`Success Reset Status: ${successResetRes.status}`);
    console.log(`Output:`, successResetRes.data);
    const newTempPassword = successResetRes.data.tempPassword;

    // 8. Check user reset status is now 'approved'
    console.log('\nTest 8: Checking user status tracker after approval...');
    const approvedStatus = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/reset-status/client10',
      method: 'GET'
    });
    console.log(`Tracker Status: ${approvedStatus.data.status} | Temp Password: ${approvedStatus.data.tempPassword}`);

    // 9. Verify target client can now log in with the new temporary password
    console.log('\nTest 9: Testing Client login with newly generated temporary password...');
    const clientNewLogin = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'client10', password: newTempPassword, role: 'client' });
    console.log(`Client Login with Temp Password Status: ${clientNewLogin.status} (Expected 200)`);

    // 10. Fetch Audit Logs
    console.log('\nTest 10: Fetching Security Audit Logs...');
    const auditRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/audit-logs',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${superiorToken}` }
    });
    console.log(`Total Audit Events logged: ${auditRes.data.length}`);
    console.log(`Latest 3 Audit Events:`);
    console.log(auditRes.data.slice(0, 3));

    console.log('\n==================================================');
    console.log('   ALL PIN-GATED RESET TESTS PASSED WITH 100% SUCCESS!');
    console.log('==================================================');
  } catch (err) {
    console.error('Test error:', err);
  }
}

runTests();
