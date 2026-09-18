const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bank_name: {
    type: String,
    required: true,
    trim: true
  },
  account_number: {
    type: String,
    required: true,
    trim: true
  },
  account_type: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  routing_number: {
    type: String,
    required: true,
    trim: true
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

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
module.exports = BankAccount;
