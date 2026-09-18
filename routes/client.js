const express = require('express');
const router = express.Router();
const { ClientProfile, BankAccount, PreviousLoan, LoanAnalysis } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { runAnalysis } = require('../services/analysis');
const { validate, profileSchema, bankAccountSchema, loanSchema } = require('../middleware/validation');

// All client routes require client authentication
router.use(authenticateToken, requireRole('client'));

// Helper to trigger analysis updates silently or return if profile exists
const triggerAnalysisUpdate = async (userId) => {
  try {
    const profile = await ClientProfile.findOne({ userId });
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
    const profile = await ClientProfile.findOne({ userId: req.user.id });
    res.json(profile || null);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch financial profile.' });
  }
});

// 2. Create or Update client profile
router.post('/profile', validate(profileSchema), async (req, res) => {
  const { full_name, credit_score, annual_income, monthly_expenses, requested_loan_amount, loan_purpose } = req.body;

  try {
    await ClientProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        full_name,
        credit_score,
        annual_income,
        monthly_expenses,
        requested_loan_amount,
        loan_purpose: loan_purpose || ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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
    const accounts = await BankAccount.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json(accounts);
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    res.status(500).json({ error: 'Failed to fetch bank accounts.' });
  }
});

// 4. Add a client bank account
router.post('/bank-accounts', validate(bankAccountSchema), async (req, res) => {
  const { bank_name, account_number, account_type, balance, routing_number } = req.body;

  try {
    await BankAccount.create({
      userId: req.user.id,
      bank_name,
      account_number,
      account_type,
      balance,
      routing_number
    });

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
    const loans = await PreviousLoan.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json(loans);
  } catch (err) {
    console.error('Error fetching previous loans:', err);
    res.status(500).json({ error: 'Failed to fetch previous loans.' });
  }
});

// 6. Add a client previous loan
router.post('/loans', validate(loanSchema), async (req, res) => {
  const { lender_name, loan_amount, remaining_balance, monthly_payment, status } = req.body;

  try {
    await PreviousLoan.create({
      userId: req.user.id,
      lender_name,
      loan_amount,
      remaining_balance,
      monthly_payment,
      status
    });

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
    let analysis = await LoanAnalysis.findOne({ userId: req.user.id });
    
    // If analysis does not exist, but client profile is present, run it now
    if (!analysis) {
      const profile = await ClientProfile.findOne({ userId: req.user.id });
      if (profile) {
        analysis = await runAnalysis(req.user.id);
      } else {
        return res.status(400).json({ error: 'Please complete your financial profile first to generate analysis.' });
      }
    }

    res.json(analysis);
  } catch (err) {
    console.error('Error fetching analysis:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch analysis.' });
  }
});

module.exports = router;
