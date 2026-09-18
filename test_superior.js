const BASE_URL = 'http://localhost:3000';

async function testSuperiorFeature() {
  console.log('--- Testing Superior Authentication & Role Access ---');

  // 1. Test Login with Superior credentials via role=admin
  const supLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'superior',
      password: 'SuperiorPassword123',
      role: 'admin'
    })
  });

  const supData = await supLoginRes.json();
  console.log('Superior Login Status:', supLoginRes.status);
  console.log('Superior Token and Role:', { role: supData.role, username: supData.username });
  if (supData.role !== 'superior') {
    throw new Error('Expected role to be superior');
  }

  const superiorToken = supData.token;

  // 2. Test Login with Normal Admin
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test_admin_001',
      password: 'AdminPassword123',
      role: 'admin'
    })
  });

  const adminData = await adminLoginRes.json();
  console.log('Admin Login Status:', adminLoginRes.status, 'Role:', adminData.role);
  const adminToken = adminData.token;

  // 3. Test Superior creating a new administrator
  const newAdminName = `auditor_${Date.now().toString().slice(-4)}`;
  console.log(`\nTesting Superior creating new admin: ${newAdminName}...`);
  const createAdminRes = await fetch(`${BASE_URL}/api/admin/administrators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superiorToken}`
    },
    body: JSON.stringify({
      username: newAdminName,
      password: 'AuditorPassword123'
    })
  });

  const createAdminData = await createAdminRes.json();
  console.log('Create Admin Status (Superior):', createAdminRes.status, createAdminData);
  const createdAdminId = createAdminData.adminId;

  // 4. Test Normal Admin attempting to create administrator (MUST FAIL WITH 403)
  console.log('\nTesting Normal Admin trying to create admin (Server-side RBAC check)...');
  const forbiddenCreateRes = await fetch(`${BASE_URL}/api/admin/administrators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      username: 'illegal_admin',
      password: 'SomePassword123'
    })
  });
  console.log('Admin create admin status (Must be 403):', forbiddenCreateRes.status);
  if (forbiddenCreateRes.status !== 403) {
    throw new Error('Security violation: Normal admin was not blocked with 403!');
  }
  console.log('PASSED: Server-side RBAC blocked normal admin from write endpoint.');

  // 5. Test Normal Admin trying to edit client profile (MUST FAIL WITH 403)
  console.log('\nTesting Normal Admin trying to edit client profile (Server-side RBAC check)...');
  const forbiddenClientEdit = await fetch(`${BASE_URL}/api/admin/clients/1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      full_name: 'Hacked Name',
      credit_score: 800,
      annual_income: 100000,
      monthly_expenses: 1000,
      requested_loan_amount: 50000
    })
  });
  console.log('Admin edit client status (Must be 403):', forbiddenClientEdit.status);
  if (forbiddenClientEdit.status !== 403) {
    throw new Error('Security violation: Normal admin was not blocked from editing client!');
  }
  console.log('PASSED: Server-side RBAC blocked normal admin from editing client profile.');

  // 6. Test Superior editing client profile (MUST SUCCEED 200)
  console.log('\nTesting Superior editing client profile & recalculating analysis...');
  const superiorClientEdit = await fetch(`${BASE_URL}/api/admin/clients/1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superiorToken}`
    },
    body: JSON.stringify({
      full_name: 'Jane Doe Updated',
      credit_score: 760,
      annual_income: 95000,
      monthly_expenses: 1800,
      requested_loan_amount: 30000,
      loan_purpose: 'Home Upgrade'
    })
  });
  console.log('Superior edit client status (200):', superiorClientEdit.status);
  const editData = await superiorClientEdit.json();
  console.log('Updated AI analysis output:', editData);

  // 7. Test Superior deleting created admin
  console.log(`\nTesting Superior deleting admin #${createdAdminId}...`);
  const delAdminRes = await fetch(`${BASE_URL}/api/admin/administrators/${createdAdminId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${superiorToken}` }
  });
  console.log('Delete admin status (200):', delAdminRes.status);

  // 8. Test Superior listing administrators (Read access)
  const listAdminsRes = await fetch(`${BASE_URL}/api/admin/administrators`, {
    headers: { 'Authorization': `Bearer ${superiorToken}` }
  });
  const adminList = await listAdminsRes.json();
  console.log('Current Administrators count:', adminList.length);

  console.log('\n=============================================');
  console.log('ALL SUPERIOR ROLE TESTS COMPLETED SUCCESSFULLY!');
  console.log('=============================================');
}

testSuperiorFeature().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
