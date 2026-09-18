const mongoose = require('mongoose');

const previousLoanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lender_name: {
    type: String,
    required: true,
    trim: true
  },
  loan_amount: {
    type: Number,
    required: true
  },
  remaining_balance: {
    type: Number,
    required: true
  },
  monthly_payment: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paid'],
    required: true,
    default: 'active'
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

const PreviousLoan = mongoose.model('PreviousLoan', previousLoanSchema);
module.exports = PreviousLoan;
