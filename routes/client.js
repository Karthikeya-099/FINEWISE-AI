const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { runAnalysis } = require('../services/analysis');

// All client routes require client authentication
router.use(authenticateToken, requireRole('client'));

// Helper to trigger analysis updates silently or return if profile exists
const triggerAnalysisUpdate = async (userId) => {
  try {
    const profile = await dbGet('SELECT id FROM client_profiles WHERE user_id = ?', [userId]);
    if (profile) {
      await runAnalysis(userId);
    }
  } catch (err) {
    console.error(`Automatic analysis update failed for user ${userId}:`, err.message);
  }
};

// 1. Get client profile
router.get('/profile', async (req, res) => {
  try {
    const profile = await dbGet('SELECT * FROM client_profiles WHERE user_id = ?', [req.user.id]);
    res.json(profile || null);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch financial profile.' });
  }
});

// 2. Create or Update client profile
router.post('/profile', async (req, res) => {
  const { full_name, credit_score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose } = req.body;

  if (!full_name || credit_score === undefined || annual_income === undefined || monthly_expenses === undefined || requested_loan_amount === undefined) {
    return res.status(400).json({ error: 'Missing required profile fields.' });
  }

  const score = parseInt(credit_score);
  if (isNaN(score) || score < 300 || score > 850) {
    return res.status(400).json({ error: 'Credit score must be between 300 and 850.' });
  }

  try {
    const existingProfile = await dbGet('SELECT id FROM client_profiles WHERE user_id = ?', [req.user.id]);
    
    if (existingProfile) {
      await dbRun(
        `UPDATE client_profiles 
         SET full_name = ?, credit_score = ?, annual_income = ?, monthly_expenses = ?, requested_loan_amount = ?, loan_purpose = ?
         WHERE user_id = ?`,
        [full_name, score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose || '', req.user.id]
      );
    } else {
      await dbRun(
        `INSERT INTO client_profiles (user_id, full_name, credit_score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, full_name, score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose || '']
      );
    }

    // Trigger analysis update since profile changed
    await triggerAnalysisUpdate(req.user.id);
    
    res.json({ message: 'Financial profile saved successfully.' });
  } catch (err) {
    console.error('Error saving profile:', err);
    res.status(500).json({ error: 'Failed to save profile.' });
  }
});

// 3. Get client bank accounts
router.get('/bank-accounts', async (req, res) => {
  try {
    const accounts = await dbAll('SELECT id, bank_name, account_number, account_type, balance, routing_number, created_at FROM bank_accounts WHERE user_id = ?', [req.user.id]);
    res.json(accounts);
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    res.status(500).json({ error: 'Failed to fetch bank accounts.' });
  }
});

// 4. Add a client bank account
router.post('/bank-accounts', async (req, res) => {
  const { bank_name, account_number, account_type, balance, routing_number } = req.body;

  if (!bank_name || !account_number || !account_type || balance === undefined || !routing_number) {
    return res.status(400).json({ error: 'All bank account details are required.' });
  }

  try {
    await dbRun(
      `INSERT INTO bank_accounts (user_id, bank_name, account_number, account_type, balance, routing_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, bank_name, account_number, account_type, balance, routing_number]
    );

    // Update analysis with new cash reserves
    await triggerAnalysisUpdate(req.user.id);

    res.status(201).json({ message: 'Bank account added successfully.' });
  } catch (err) {
    console.error('Error adding bank account:', err);
    res.status(500).json({ error: 'Failed to add bank account.' });
  }
});

// 5. Get client previous loans
router.get('/loans', async (req, res) => {
  try {
    const loans = await dbAll('SELECT * FROM previous_loans WHERE user_id = ?', [req.user.id]);
    res.json(loans);
  } catch (err) {
    console.error('Error fetching previous loans:', err);
    res.status(500).json({ error: 'Failed to fetch previous loans.' });
  }
});

// 6. Add a client previous loan
router.post('/loans', async (req, res) => {
  const { lender_name, loan_amount, remaining_balance, monthly_payment, status } = req.body;

  if (!lender_name || loan_amount === undefined || remaining_balance === undefined || monthly_payment === undefined || !status) {
    return res.status(400).json({ error: 'All loan details are required.' });
  }

  if (status !== 'active' && status !== 'paid') {
    return res.status(400).json({ error: 'Loan status must be active or paid.' });
  }

  try {
    await dbRun(
      `INSERT INTO previous_loans (user_id, lender_name, loan_amount, remaining_balance, monthly_payment, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, lender_name, loan_amount, remaining_balance, monthly_payment, status]
    );

    // Update analysis with new debt payments
    await triggerAnalysisUpdate(req.user.id);

    res.status(201).json({ message: 'Previous loan detail added successfully.' });
  } catch (err) {
    console.error('Error adding previous loan:', err);
    res.status(500).json({ error: 'Failed to add previous loan.' });
  }
});

// 7. Get client analysis report
router.get('/analysis', async (req, res) => {
  try {
    let analysis = await dbGet('SELECT * FROM loan_analysis WHERE user_id = ?', [req.user.id]);
    
    // If analysis does not exist, but client profile is present, run it now
    if (!analysis) {
      const profile = await dbGet('SELECT id FROM client_profiles WHERE user_id = ?', [req.user.id]);
      if (profile) {
        const result = await runAnalysis(req.user.id);
        analysis = result;
      } else {
        return res.status(400).json({ error: 'Please complete your financial profile first to generate analysis.' });
      }
    } else {
      // Parse recommendations from string
      analysis.recommendations = JSON.parse(analysis.recommendations);
    }

    res.json(analysis);
  } catch (err) {
    console.error('Error fetching analysis:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch analysis.' });
  }
});

module.exports = router;
