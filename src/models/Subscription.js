const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  plan: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due'],
    default: 'active'
  },
  payment: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    stripeSubscriptionId: { type: String, default: '' },
    stripeCustomerId: { type: String, default: '' }
  },
  currentPeriod: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  providerEarning: {
    amount: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 }
  }
}, { timestamps: true });

subscriptionSchema.index({ user: 1, provider: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'currentPeriod.end': 1 });

subscriptionSchema.statics.isActiveSubscriber = async function (userId, providerId) {
  const sub = await this.findOne({
    user: userId,
    provider: providerId,
    status: 'active',
    'currentPeriod.end': { $gt: new Date() }
  });
  return !!sub;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
