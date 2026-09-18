const mongoose = require('mongoose');

const clientProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  credit_score: {
    type: Number,
    required: true
  },
  annual_income: {
    type: Number,
    required: true
  },
  monthly_expenses: {
    type: Number,
    required: true
  },
  requested_loan_amount: {
    type: Number,
    required: true
  },
  loan_purpose: {
    type: String,
    default: ''
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

const ClientProfile = mongoose.model('ClientProfile', clientProfileSchema);
module.exports = ClientProfile;
