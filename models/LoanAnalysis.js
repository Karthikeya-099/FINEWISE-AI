const mongoose = require('mongoose');

const loanAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  cwi: {
    type: Number,
    default: null
  },
  risk_score: {
    type: String,
    required: true
  },
  approved_amount: {
    type: Number,
    required: true
  },
  debt_to_income_ratio: {
    type: Number,
    required: true
  },
  interest_rate_offered: {
    type: Number,
    required: true
  },
  recommendations: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      ret.user_id = ret.userId ? ret.userId.toString() : ret.user_id;
      return ret;
    }
  }
});

const LoanAnalysis = mongoose.model('LoanAnalysis', loanAnalysisSchema);
module.exports = LoanAnalysis;
