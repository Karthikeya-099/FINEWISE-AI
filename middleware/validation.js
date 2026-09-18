const { z } = require('zod');

// Schema for User Registration
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  role: z.enum(['client', 'admin'], {
    errorMap: () => ({ message: 'Role must be either client or admin.' })
  })
});

// Schema for User Login
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
  role: z.enum(['client', 'admin'], {
    errorMap: () => ({ message: 'Invalid role specified.' })
  })
});

// Schema for Client Profile
const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required.'),
  credit_score: z.coerce.number().int().min(300, 'Credit score must be between 300 and 850.').max(850, 'Credit score must be between 300 and 850.'),
  annual_income: z.coerce.number().min(0, 'Annual income cannot be negative.'),
  monthly_expenses: z.coerce.number().min(0, 'Monthly expenses cannot be negative.'),
  requested_loan_amount: z.coerce.number().min(1, 'Requested loan amount must be greater than 0.'),
  loan_purpose: z.string().optional()
});

// Schema for Bank Account
const bankAccountSchema = z.object({
  bank_name: z.string().min(2, 'Bank name is required.'),
  account_number: z.string().regex(/^\d{8,18}$/, 'Account number must be numeric and between 8 to 18 digits.'),
  account_type: z.string().min(2, 'Account type is required.'),
  balance: z.coerce.number().min(0, 'Balance cannot be negative.'),
  routing_number: z.string().regex(/^\d{9}$/, 'Routing number must be exactly 9 digits.')
});

// Schema for Previous Loan
const loanSchema = z.object({
  lender_name: z.string().min(2, 'Lender name is required.'),
  loan_amount: z.coerce.number().min(1, 'Loan amount must be greater than 0.'),
  remaining_balance: z.coerce.number().min(0, 'Remaining balance cannot be negative.'),
  monthly_payment: z.coerce.number().min(0, 'Monthly payment cannot be negative.'),
  status: z.enum(['active', 'paid'], {
    errorMap: () => ({ message: 'Loan status must be either active or paid.' })
  })
});

// Generic validation middleware
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Map Zod errors to a simpler format
      const errors = error.errors.map(err => err.message);
      return res.status(400).json({ error: errors.join(' ') });
    }
    next(error);
  }
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  profileSchema,
  bankAccountSchema,
  loanSchema
};
