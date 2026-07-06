const { dbGet, dbAll, dbRun } = require('../database');

/**
 * Multi-Factor Creditworthiness Index (MF-CWI) Algorithm
 * A single, highly accurate, mathematical decision algorithm for credit risk,
 * interest rate estimation, and maximum approved loan amount based on 5 dimensions.
 */
const runAnalysis = async (userId) => {
  // 1. Fetch data
  const profile = await dbGet('SELECT * FROM client_profiles WHERE user_id = ?', [userId]);
  if (!profile) {
    throw new Error('Client profile not found. Complete profile details first.');
  }

  const bankAccounts = await dbAll('SELECT * FROM bank_accounts WHERE user_id = ?', [userId]);
  const previousLoans = await dbAll('SELECT * FROM previous_loans WHERE user_id = ?', [userId]);

  const { credit_score, annual_income, monthly_expenses, requested_loan_amount } = profile;

  // 2. Calculations
  const monthlyIncome = annual_income / 12;

  // Sum of active previous loan monthly payments and remaining balances
  let totalActiveMonthlyLoanPayments = 0;
  let totalRemainingBalance = 0;
  let totalOriginalLoanAmount = 0;

  previousLoans.forEach((loan) => {
    if (loan.status === 'active') {
      totalActiveMonthlyLoanPayments += loan.monthly_payment;
      totalRemainingBalance += loan.remaining_balance;
      totalOriginalLoanAmount += loan.loan_amount;
    }
  });

  // Sum of bank account balances
  const totalReserves = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Calculate Debt-to-Income (DTI)
  // DTI = (Monthly Expenses + Active Loan Payments) / Monthly Income
  const dti = monthlyIncome > 0 
    ? (monthly_expenses + totalActiveMonthlyLoanPayments) / monthlyIncome 
    : 1.0;

  // --- Step A: Normalization of Inputs (0 to 1) ---
  // 1. Credit Score (300 to 850)
  const sCredit = Math.max(0, Math.min(1, (credit_score - 300) / (850 - 300)));

  // 2. DTI Score (0 to 60% mapped to 1 to 0)
  const sDti = Math.max(0, Math.min(1, 1 - (dti / 0.60)));

  // 3. Expense-to-Income Score (lower is better, mapped to 0 to 1)
  const expenseRatio = monthlyIncome > 0 ? (monthly_expenses / monthlyIncome) : 1.0;
  const sExp = Math.max(0, Math.min(1, 1 - expenseRatio));

  // 4. Reserves Score (liquid cash vs 3 months of expenses)
  const reserveThreshold = Math.max(1000, monthly_expenses * 3);
  const sRes = Math.max(0, Math.min(1, totalReserves / reserveThreshold));

  // 5. Loan History Score
  let sHistory = 1.0;
  if (totalOriginalLoanAmount > 0) {
    // Score increases as remaining balance decreases relative to original loan
    sHistory = Math.max(0, Math.min(1, 1 - (totalRemainingBalance / totalOriginalLoanAmount)));
  }

  // --- Step B: Weighted CWI Calculation ---
  // Weights: Credit Score (40%), DTI (25%), Expense Ratio (15%), Cash Reserves (10%), Loan History (10%)
  const cwi = (0.40 * sCredit) + (0.25 * sDti) + (0.15 * sExp) + (0.10 * sRes) + (0.10 * sHistory);

  // --- Step C: Risk Tiering ---
  let riskScore = 'High';
  if (cwi >= 0.75) {
    riskScore = 'Low';
  } else if (cwi >= 0.50) {
    riskScore = 'Medium';
  }

  // --- Step D: Risk-Adjusted Interest Rate (ROI) ---
  // Base Rate = 4.5%, Risk Premium = 15%. ROI = Base + (1 - CWI) * Premium
  const baseRate = 0.045;
  const riskPremium = 0.15;
  const roi = baseRate + (1 - cwi) * riskPremium;

  // --- Step E: Approved Loan Amount Calculation ---
  // Max allowable monthly payment based on Credit Score tier and CWI
  let dtiThreshold = 0.30;
  if (credit_score >= 750) {
    dtiThreshold = 0.45;
  } else if (credit_score >= 650) {
    dtiThreshold = 0.38;
  }

  const maxMonthlyPaymentAllowed = (monthlyIncome * (dtiThreshold * cwi)) - totalActiveMonthlyLoanPayments;

  let approvedAmount = 0;
  if (maxMonthlyPaymentAllowed > 0) {
    // Amortization formula for 60-month term (5 years)
    const n = 60;
    const r = roi / 12; // monthly rate
    // P = PMT * (1 - (1 + r)^-n) / r
    approvedAmount = maxMonthlyPaymentAllowed * (1 - Math.pow(1 + r, -n)) / r;

    // Cap at 3x annual income or $250,000 maximum
    const cap = Math.min(annual_income * 3, 250000);
    if (approvedAmount > cap) {
      approvedAmount = cap;
    }
    // Round to nearest hundred
    approvedAmount = Math.round(approvedAmount / 100) * 100;
  }

  // --- Step F: Bank Recommendation Matching ---
  const bankPolicies = [
    {
      bank: 'Chase Premier Personal',
      minCreditScore: 720,
      maxDti: 0.38,
      baseInterest: 0.0599,
      maxAmount: 150000,
      termMonths: 60,
      description: 'Excellent rates for borrowers with strong credit scores and lower DTI ratio.'
    },
    {
      bank: 'Bank of America Standard',
      minCreditScore: 660,
      maxDti: 0.43,
      baseInterest: 0.0749,
      maxAmount: 80000,
      termMonths: 60,
      description: 'Competitive options with moderate credit and stable income.'
    },
    {
      bank: 'Wells Fargo Personal',
      minCreditScore: 620,
      maxDti: 0.48,
      baseInterest: 0.0999,
      maxAmount: 50000,
      termMonths: 48,
      description: 'Flexible terms suited for clients consolidating debts.'
    },
    {
      bank: 'Capital One Starter',
      minCreditScore: 580,
      maxDti: 0.50,
      baseInterest: 0.1349,
      maxAmount: 25000,
      termMonths: 36,
      description: 'Ideal for establishing credit or shorter term small personal loans.'
    }
  ];

  // Recommendations mapping
  const recommendations = bankPolicies
    .filter((policy) => credit_score >= policy.minCreditScore && dti <= policy.maxDti)
    .map((policy) => {
      // Adjust interest rate slightly based on client's CWI
      // Higher CWI = closer to the base rate of the bank policy
      const adjustedRate = policy.baseInterest + (1 - cwi) * 0.05;
      const finalRate = Math.min(adjustedRate, policy.baseInterest + 0.06);

      // Estimate monthly payment for the bank's maximum possible loan or user's requested amount
      const loanTarget = Math.min(policy.maxAmount, requested_loan_amount, approvedAmount || requested_loan_amount);
      const mr = finalRate / 12;
      const mt = policy.termMonths;
      const estPayment = loanTarget > 0 
        ? (loanTarget * mr) / (1 - Math.pow(1 + mr, -mt))
        : 0;

      return {
        bankName: policy.bank,
        offeredRate: parseFloat((finalRate * 100).toFixed(2)),
        maxAmount: policy.maxAmount,
        termMonths: policy.termMonths,
        estimatedMonthlyPayment: parseFloat(estPayment.toFixed(2)),
        description: policy.description
      };
    })
    .sort((a, b) => a.offeredRate - b.offeredRate);

  // 3. Save / Update analysis in database
  const existingAnalysis = await dbGet('SELECT id FROM loan_analysis WHERE user_id = ?', [userId]);

  const recString = JSON.stringify(recommendations);
  const roundedDti = parseFloat(dti.toFixed(4));
  const roundedRoi = parseFloat((roi * 100).toFixed(2));
  const roundedApproved = parseFloat(approvedAmount.toFixed(2));
  const roundedCwi = parseFloat(cwi.toFixed(4));

  if (existingAnalysis) {
    await dbRun(
      `UPDATE loan_analysis 
       SET cwi = ?, risk_score = ?, approved_amount = ?, debt_to_income_ratio = ?, interest_rate_offered = ?, recommendations = ?, created_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [roundedCwi, riskScore, roundedApproved, roundedDti, roundedRoi, recString, userId]
    );
  } else {
    await dbRun(
      `INSERT INTO loan_analysis (user_id, cwi, risk_score, approved_amount, debt_to_income_ratio, interest_rate_offered, recommendations)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, roundedCwi, riskScore, roundedApproved, roundedDti, roundedRoi, recString]
    );
  }

  return {
    userId,
    cwi: parseFloat(cwi.toFixed(4)),
    riskScore,
    approvedAmount: roundedApproved,
    debtToIncomeRatio: roundedDti,
    interestRateOffered: roundedRoi,
    recommendations
  };
};

module.exports = {
  runAnalysis
};
