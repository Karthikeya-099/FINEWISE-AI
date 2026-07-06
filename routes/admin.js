const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All admin routes require admin authentication
router.use(authenticateToken, requireRole('admin'));

// 1. Get all client users, profiles, and loan analysis
router.get('/clients', async (req, res) => {
  try {
    const clients = await dbAll(`
      SELECT 
        u.id AS user_id,
        u.username,
        cp.full_name,
        cp.credit_score,
        cp.annual_income,
        cp.monthly_expenses,
        cp.requested_loan_amount,
        cp.loan_purpose,
        la.risk_score,
        la.approved_amount,
        la.cwi,
        la.debt_to_income_ratio,
        la.interest_rate_offered,
        la.recommendations
      FROM users u
      LEFT JOIN client_profiles cp ON u.id = cp.user_id
      LEFT JOIN loan_analysis la ON u.id = la.user_id
      WHERE u.role = 'client'
      ORDER BY u.created_at DESC
    `);

    // Parse recommendations for each client
    const clientList = clients.map(client => {
      if (client.recommendations) {
        try {
          client.recommendations = JSON.parse(client.recommendations);
        } catch (e) {
          client.recommendations = [];
        }
      } else {
        client.recommendations = null;
      }
      return client;
    });

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
    const clientProfile = await dbGet(`
      SELECT 
        u.id AS user_id, 
        u.username, 
        cp.full_name, 
        cp.credit_score, 
        cp.annual_income, 
        cp.monthly_expenses, 
        cp.requested_loan_amount, 
        cp.loan_purpose 
      FROM users u
      LEFT JOIN client_profiles cp ON u.id = cp.user_id
      WHERE u.id = ? AND u.role = 'client'
    `, [clientId]);

    if (!clientProfile) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const analysis = await dbGet('SELECT * FROM loan_analysis WHERE user_id = ?', [clientId]);
    if (analysis) {
      analysis.recommendations = JSON.parse(analysis.recommendations);
    }

    res.json({
      profile: clientProfile,
      analysis: analysis || null
    });
  } catch (err) {
    console.error('Error fetching client details:', err);
    res.status(500).json({ error: 'Failed to retrieve client details.' });
  }
});

module.exports = router;
