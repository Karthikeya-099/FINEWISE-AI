const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'All fields (username, password, role) are required.' });
  }

  if (role !== 'client' && role !== 'admin') {
    return res.status(400).json({ error: 'Role must be either client or admin.' });
  }

  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbRun(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );

    res.status(201).json({ message: 'User registered successfully.', userId: result.id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required.' });
  }

  if (role !== 'client' && role !== 'admin') {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  try {
    // 1. First, check if the username exists in the database
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      const errorMsg = role === 'client' ? 'Invalid Client credentials.' : 'Invalid Administrator credentials.';
      return res.status(401).json({ error: errorMsg });
    }

    // 2. Prevent role spoofing / cross-authentication
    if (user.role !== role) {
      if (role === 'client') {
        return res.status(401).json({ error: 'Administrator credentials cannot be used in Client Login.' });
      } else {
        return res.status(401).json({ error: 'Client credentials cannot be used in Administrator Login.' });
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
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

module.exports = router;
