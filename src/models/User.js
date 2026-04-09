const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['viewer', 'provider', 'admin'],
    default: 'viewer'
  },
  // IDs of providers this user follows
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider'
  }],
  // Content this user has purchased
  purchases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase'
  }],
  wallet: {
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'usd' }
  },
  stripeCustomerId: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.stripeCustomerId;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
