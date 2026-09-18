const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, ClientProfile, BankAccount, PreviousLoan, LoanAnalysis, PasswordResetRequest, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { runAnalysis } = require('../services/analysis');
const { validate, profileSchema } = require('../middleware/validation');

// Base authentication for all /api/admin routes: requires at least admin or superior
router.use(authenticateToken, requireRole('admin', 'superior'));

// ==========================================
// PIN RATE LIMITING & SECURITY TRACKER
// ==========================================
const pinAttemptTracker = new Map(); // key: userId, value: { attempts, lockedUntil }

const checkPinRateLimit = (userId) => {
  const now = Date.now();
  const record = pinAttemptTracker.get(userId.toString());
  if (record) {
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingMin = Math.ceil((record.lockedUntil - now) / 60000);
      return `Security Lockout: 5 failed PIN attempts reached. Locked for ${remainingMin} more minute(s).`;
    }
    if (record.lockedUntil && now >= record.lockedUntil) {
      pinAttemptTracker.delete(userId.toString());
    }
  }
  return null;
};

const recordPinFailure = (userId) => {
  const now = Date.now();
  const key = userId.toString();
  let record = pinAttemptTracker.get(key) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;
  if (record.attempts >= 5) {
    record.lockedUntil = now + (15 * 60 * 1000); // 15 minute cooldown
  }
  pinAttemptTracker.set(key, record);
  return record.attempts;
};

const clearPinFailures = (userId) => {
  pinAttemptTracker.delete(userId.toString());
};

// ==========================================
// 1. READ ENDPOINTS (Admin & Superior)
// ==========================================

// 1. Get all client users, profiles, and loan analysis
router.get('/clients', async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).sort({ createdAt: -1 });

    const clientList = await Promise.all(
      clients.map(async (client) => {
        const profile = await ClientProfile.findOne({ userId: client._id });
        const analysis = await LoanAnalysis.findOne({ userId: client._id });

        return {
          user_id: client._id.toString(),
          username: client.username,
          full_name: profile ? profile.full_name : null,
          credit_score: profile ? profile.credit_score : null,
          annual_income: profile ? profile.annual_income : null,
          monthly_expenses: profile ? profile.monthly_expenses : null,
          requested_loan_amount: profile ? profile.requested_loan_amount : null,
          loan_purpose: profile ? profile.loan_purpose : null,
          risk_score: analysis ? analysis.risk_score : null,
          approved_amount: analysis ? analysis.approved_amount : null,
          cwi: analysis ? analysis.cwi : null,
          debt_to_income_ratio: analysis ? analysis.debt_to_income_ratio : null,
          interest_rate_offered: analysis ? analysis.interest_rate_offered : null,
          recommendations: analysis ? analysis.recommendations : null
        };
      })
    );

    res.json(clientList);
  } catch (err) {
    console.error('Error fetching admin client list:', err);
    res.status(500).json({ error: 'Failed to retrieve clients directories.' });
  }
});

// 2. Get specific client analysis summary
router.get('/clients/:id/analysis', async (req, res) => {
  const clientId = req.params.id;

  try {
    const clientUser = await User.findOne({ _id: clientId, role: 'client' });
    if (!clientUser) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const profile = await ClientProfile.findOne({ userId: clientId });
    const analysis = await LoanAnalysis.findOne({ userId: clientId });

    res.json({
      profile: {
        user_id: clientUser._id.toString(),
        username: clientUser.username,
        full_name: profile ? profile.full_name : null,
        credit_score: profile ? profile.credit_score : null,
        annual_income: profile ? profile.annual_income : null,
        monthly_expenses: profile ? profile.monthly_expenses : null,
        requested_loan_amount: profile ? profile.requested_loan_amount : null,
        loan_purpose: profile ? profile.loan_purpose : null
      },
      analysis: analysis || null
    });
  } catch (err) {
    console.error('Error fetching client details:', err);
    res.status(500).json({ error: 'Failed to retrieve client details.' });
  }
});

// 3. Get all administrators & superiors (read-only list for dashboard directory)
router.get('/administrators', async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superior'] } }).sort({ createdAt: 1 });
    const formatted = admins.map(admin => ({
      id: admin._id.toString(),
      username: admin.username,
      role: admin.role,
      created_at: admin.createdAt || admin.created_at
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching administrators list:', err);
    res.status(500).json({ error: 'Failed to retrieve administrators.' });
  }
});

// ==========================================
// 2. WRITE ENDPOINTS (STRICTLY SUPERIOR ONLY)
// ==========================================

// 4. PIN-Gated Password Reset (Superior Only)
router.post('/reset-password', requireRole('superior'), async (req, res) => {
  const { targetUserId, pin, customPassword, requestId } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ error: 'Target user ID is required.' });
  }

  // A. Check rate limit lockout
  const lockoutMsg = checkPinRateLimit(req.user.id);
  if (lockoutMsg) {
    return res.status(429).json({ error: lockoutMsg });
  }

  // B. Verify PIN against secret environment variable
  const correctPin = process.env.SUPERIOR_RESET_PIN || '8492';
  const providedPin = (pin || '').toString().trim();

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user account not found.' });
  }

  if (providedPin !== correctPin.trim()) {
    const attempts = recordPinFailure(req.user.id);
    
    // Log failed attempt in audit log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'PASSWORD_RESET_PIN_FAILED',
      target_user_id: targetUser._id,
      target_username: targetUser.username,
      status: 'FAILED',
      details: `Invalid PIN attempt (${attempts}/5)`
    });

    if (attempts >= 5) {
      return res.status(429).json({ error: 'Security Lockout: 5 failed PIN attempts reached. Password reset locked for 15 minutes.' });
    }

    return res.status(401).json({ error: `Invalid Superior Security PIN. Attempts remaining before lockout: ${5 - attempts}` });
  }

  // C. PIN Verified -> Generate new password and hash
  clearPinFailures(req.user.id);

  const newTempPassword = (customPassword && customPassword.trim().length >= 6) 
    ? customPassword.trim() 
    : `Temp_${crypto.randomBytes(3).toString('hex')}!84`;

  try {
    const hashedPassword = await bcrypt.hash(newTempPassword, 10);

    // Update password in database
    targetUser.password = hashedPassword;
    await targetUser.save();

    // Update any linked password reset request to approved
    if (requestId) {
      await PasswordResetRequest.findByIdAndUpdate(requestId, {
        status: 'approved',
        temp_password_or_token: newTempPassword,
        resolved_by: req.user.id,
        resolved_at: new Date()
      });
    } else {
      await PasswordResetRequest.updateMany(
        { userId: targetUser._id, status: 'pending' },
        {
          status: 'approved',
          temp_password_or_token: newTempPassword,
          resolved_by: req.user.id,
          resolved_at: new Date()
        }
      );
    }

    // Log successful reset in audit log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'PASSWORD_RESET_SUCCESS',
      target_user_id: targetUser._id,
      target_username: targetUser.username,
      status: 'SUCCESS',
      details: 'Password successfully reset with validated PIN'
    });

    res.json({
      message: `Password for user "@${targetUser.username}" reset successfully.`,
      targetUsername: targetUser.username,
      tempPassword: newTempPassword
    });
  } catch (err) {
    console.error('Password reset execution error:', err);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

// 5. Get Password Reset Requests (Superior Only)
router.get('/reset-requests', requireRole('superior'), async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate('resolved_by', 'username')
      .sort({ status: -1, createdAt: -1 });

    const formatted = requests.map(pr => ({
      id: pr._id.toString(),
      user_id: pr.userId ? pr.userId.toString() : null,
      username: pr.username,
      role: pr.role,
      status: pr.status,
      temp_password_or_token: pr.temp_password_or_token,
      notes: pr.notes,
      created_at: pr.createdAt || pr.created_at,
      resolved_at: pr.resolved_at,
      resolved_by_username: pr.resolved_by ? pr.resolved_by.username : null
    }));

    // Sort so pending is on top
    formatted.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching reset requests:', err);
    res.status(500).json({ error: 'Failed to retrieve password reset requests.' });
  }
});

// 6. Deny Password Reset Request (Superior Only)
router.put('/reset-requests/:id/deny', requireRole('superior'), async (req, res) => {
  const requestId = req.params.id;
  const { reason } = req.body;

  try {
    const request = await PasswordResetRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Reset request not found.' });
    }

    request.status = 'denied';
    request.notes = reason || 'Request denied by Superior Administrator.';
    request.resolved_by = req.user.id;
    request.resolved_at = new Date();
    await request.save();

    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'PASSWORD_RESET_DENIED',
      target_user_id: request.userId,
      target_username: request.username,
      status: 'SUCCESS',
      details: `Reset request denied: ${reason || 'No specific reason provided'}`
    });

    res.json({ message: `Reset request for "@${request.username}" marked as denied.` });
  } catch (err) {
    console.error('Error denying reset request:', err);
    res.status(500).json({ error: 'Failed to deny password reset request.' });
  }
});

// 7. Get Audit Logs (Superior Only)
router.get('/audit-logs', requireRole('superior'), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(100);

    const formatted = logs.map(log => ({
      id: log._id.toString(),
      actor_id: log.actor_id ? log.actor_id.toString() : null,
      actor_username: log.actor_username,
      actor_role: log.actor_role,
      action: log.action,
      target_user_id: log.target_user_id ? log.target_user_id.toString() : null,
      target_username: log.target_username,
      status: log.status,
      details: log.details,
      created_at: log.createdAt || log.created_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// 8. Edit / Update Client Profile (Superior Only)
router.put('/clients/:id/profile', requireRole('superior'), validate(profileSchema), async (req, res) => {
  const clientId = req.params.id;
  const { full_name, credit_score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose } = req.body;

  try {
    const client = await User.findOne({ _id: clientId, role: 'client' });
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    await ClientProfile.findOneAndUpdate(
      { userId: clientId },
      {
        userId: clientId,
        full_name,
        credit_score,
        annual_income,
        monthly_expenses,
        requested_loan_amount,
        loan_purpose: loan_purpose || ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Automatically recalculate algorithm scores for this client
    let updatedAnalysis = null;
    try {
      updatedAnalysis = await runAnalysis(clientId);
    } catch (analysisErr) {
      console.warn(`Analysis recalculation note for user ${clientId}:`, analysisErr.message);
    }

    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'CLIENT_PROFILE_UPDATED',
      target_user_id: client._id,
      target_username: client.username,
      status: 'SUCCESS',
      details: 'Financial profile updated and AI analysis recalculated'
    });

    res.json({
      message: 'Client profile updated and AI assessment recalculated successfully.',
      analysis: updatedAnalysis
    });
  } catch (err) {
    console.error('Error updating client profile by superior:', err);
    res.status(500).json({ error: 'Failed to update client profile: ' + err.message });
  }
});

// 9. Delete Client User (Superior Only)
router.delete('/clients/:id', requireRole('superior'), async (req, res) => {
  const clientId = req.params.id;

  try {
    const client = await User.findOne({ _id: clientId, role: 'client' });
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    await LoanAnalysis.deleteMany({ userId: clientId });
    await BankAccount.deleteMany({ userId: clientId });
    await PreviousLoan.deleteMany({ userId: clientId });
    await ClientProfile.deleteMany({ userId: clientId });
    await PasswordResetRequest.deleteMany({ userId: clientId });
    await User.findByIdAndDelete(clientId);

    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'CLIENT_DELETED',
      target_user_id: client._id,
      target_username: client.username,
      status: 'SUCCESS',
      details: 'Client account and associated records deleted'
    });

    res.json({ message: `Client account "${client.username}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting client by superior:', err);
    res.status(500).json({ error: 'Failed to delete client account.' });
  }
});

// 10. Create a New Administrator Account (Superior Only)
router.post('/administrators', requireRole('superior'), async (req, res) => {
  const { username, password } = req.body;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(400).json({ error: 'An account with this username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      username: username.trim(),
      password: hashedPassword,
      role: 'admin'
    });

    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'ADMIN_CREATED',
      target_user_id: newAdmin._id,
      target_username: username.trim(),
      status: 'SUCCESS',
      details: 'New administrator account provisioned'
    });

    res.status(201).json({
      message: 'Administrator account created successfully.',
      adminId: newAdmin._id.toString(),
      username: username.trim(),
      role: 'admin'
    });
  } catch (err) {
    console.error('Error creating admin by superior:', err);
    res.status(500).json({ error: 'Failed to create administrator account.' });
  }
});

// 11. Edit Administrator Account (Update username / reset password) (Superior Only)
router.put('/administrators/:id', requireRole('superior'), async (req, res) => {
  const adminId = req.params.id;
  const { username, password } = req.body;

  try {
    const targetAdmin = await User.findOne({ _id: adminId, role: { $in: ['admin', 'superior'] } });
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Administrator account not found.' });
    }

    let updatedUsername = targetAdmin.username;
    if (username && username.trim() !== targetAdmin.username) {
      if (username.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      }
      const duplicate = await User.findOne({ username: username.trim(), _id: { $ne: adminId } });
      if (duplicate) {
        return res.status(400).json({ error: 'Username is already taken by another account.' });
      }
      updatedUsername = username.trim();
      targetAdmin.username = updatedUsername;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      targetAdmin.password = await bcrypt.hash(password, 10);
    }

    await targetAdmin.save();

    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'ADMIN_UPDATED',
      target_user_id: targetAdmin._id,
      target_username: updatedUsername,
      status: 'SUCCESS',
      details: 'Administrator username/credentials updated'
    });

    res.json({ message: 'Administrator account updated successfully.', username: updatedUsername });
  } catch (err) {
    console.error('Error updating administrator by superior:', err);
    res.status(500).json({ error: 'Failed to update administrator account.' });
  }
});

// 12. Delete Administrator Account (Superior Only)
router.delete('/administrators/:id', requireRole('superior'), async (req, res) => {
  const adminId = req.params.id;

  if (req.user.id.toString() === adminId.toString()) {
    return res.status(400).json({ error: 'Security restriction: You cannot delete your own currently active account.' });
  }

  try {
    const targetAdmin = await User.findOne({ _id: adminId, role: { $in: ['admin', 'superior'] } });
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Administrator account not found.' });
    }

    if (targetAdmin.role === 'superior') {
      return res.status(403).json({ error: 'Security restriction: Cannot delete a Superior Administrator account.' });
    }

    await User.findByIdAndDelete(adminId);

    await AuditLog.create({
      actor_id: req.user.id,
      actor_username: req.user.username,
      actor_role: 'superior',
      action: 'ADMIN_DELETED',
      target_user_id: targetAdmin._id,
      target_username: targetAdmin.username,
      status: 'SUCCESS',
      details: 'Administrator account removed'
    });

    res.json({ message: `Administrator account "${targetAdmin.username}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting administrator by superior:', err);
    res.status(500).json({ error: 'Failed to delete administrator account.' });
  }
});

module.exports = router;
