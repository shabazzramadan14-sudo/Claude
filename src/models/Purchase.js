const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
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
  // What was purchased — either a stream or a content item
  itemType: {
    type: String,
    enum: ['stream', 'content', 'subscription'],
    required: true
  },
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    default: null
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    default: null
  },
  // Payment details
  payment: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    stripePaymentIntentId: { type: String, default: '' },
    stripeChargeId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: { type: Date }
  },
  // Access control
  access: {
    grantedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }  // null = permanent
  },
  // Provider's cut (after platform fee)
  providerEarning: {
    amount: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 }
  }
}, { timestamps: true });

purchaseSchema.index({ user: 1, itemType: 1 });
purchaseSchema.index({ provider: 1 });
purchaseSchema.index({ 'payment.status': 1 });
purchaseSchema.index({ stream: 1 });
purchaseSchema.index({ content: 1 });

// Check if a user has access to specific content
purchaseSchema.statics.hasAccess = async function (userId, itemId, itemType) {
  const purchase = await this.findOne({
    user: userId,
    [`${itemType}`]: itemId,
    'payment.status': 'succeeded',
    $or: [
      { 'access.expiresAt': null },
      { 'access.expiresAt': { $gt: new Date() } }
    ]
  });
  return !!purchase;
};

const Purchase = mongoose.model('Purchase', purchaseSchema);
module.exports = Purchase;
