const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, PasswordResetRequest, AuditLog } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');

// Register a new user
router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role
    });

    res.status(201).json({ message: 'User registered successfully.', userId: newUser._id.toString() });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // 1. First, check if the username exists in MongoDB
    const user = await User.findOne({ username });
    
    if (!user) {
      const errorMsg = role === 'client' ? 'Invalid Client credentials.' : 'Invalid Administrator credentials.';
      return res.status(401).json({ error: errorMsg });
    }

    // 2. Prevent role spoofing / cross-authentication
    // Superior users log in exclusively via the admin login portal (role === 'admin')
    if (role === 'client') {
      if (user.role === 'admin' || user.role === 'superior') {
        return res.status(401).json({ error: 'Administrator credentials cannot be used in Client Login.' });
      }
      if (user.role !== 'client') {
        return res.status(401).json({ error: 'Invalid Client credentials.' });
      }
    } else if (role === 'admin') {
      if (user.role === 'client') {
        return res.status(401).json({ error: 'Client credentials cannot be used in Administrator Login.' });
      }
      if (user.role !== 'admin' && user.role !== 'superior') {
        return res.status(401).json({ error: 'Invalid Administrator credentials.' });
      }
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const errorMsg = role === 'client' ? 'Invalid Client credentials.' : 'Invalid Administrator credentials.';
      return res.status(401).json({ error: errorMsg });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// 3. Request Password Reset (Forgot Password Flow - Username Only)
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required to request a password reset.' });
  }

  const cleanUsername = username.trim();

  try {
    const user = await User.findOne({ username: cleanUsername });

    if (user) {
      // Check if an unresolved pending request already exists
      const existingPending = await PasswordResetRequest.findOne({
        userId: user._id,
        status: 'pending'
      });

      if (!existingPending) {
        await PasswordResetRequest.create({
          userId: user._id,
          username: user.username,
          role: user.role,
          status: 'pending'
        });

        await AuditLog.create({
          actor_username: user.username,
          actor_role: user.role,
          action: 'PASSWORD_RESET_REQUESTED',
          target_user_id: user._id,
          target_username: user.username,
          status: 'PENDING',
          details: 'User submitted reset request via forgot-password portal'
        });
      }
    }

    // Always return safe confirmation message without exposing existence
    res.json({
      message: 'Your password reset request has been received and routed to the Superior Administrator for review.'
    });
  } catch (err) {
    console.error('Forgot password submission error:', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// 4. Check Password Reset Status (User can check approval status by username)
router.get('/reset-status/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const latestRequest = await PasswordResetRequest.findOne({
      username: username.trim()
    }).sort({ createdAt: -1 });

    if (!latestRequest) {
      return res.json({ status: 'none', message: 'No reset request found for this account.' });
    }

    res.json({
      status: latestRequest.status,
      username: latestRequest.username,
      role: latestRequest.role,
      requestedAt: latestRequest.createdAt || latestRequest.created_at,
      resolvedAt: latestRequest.resolved_at,
      tempPassword: latestRequest.status === 'approved' ? latestRequest.temp_password_or_token : null,
      notes: latestRequest.notes || null
    });
  } catch (err) {
    console.error('Error checking reset status:', err);
    res.status(500).json({ error: 'Failed to check reset status.' });
  }
});

module.exports = router;
