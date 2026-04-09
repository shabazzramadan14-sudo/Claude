const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  stageName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  // ArgoLive account details for shades streaming
  argoLive: {
    channelId: { type: String, default: '' },
    streamKey: { type: String, default: '' },
    rtmpUrl: { type: String, default: '' },
    hlsPlaybackUrl: { type: String, default: '' },
    isConnected: { type: Boolean, default: false }
  },
  // Shades device info
  shadesDevice: {
    deviceId: { type: String, default: '' },
    model: { type: String, default: '' },
    isActive: { type: Boolean, default: false },
    lastConnected: { type: Date }
  },
  categories: [{
    type: String,
    enum: ['sports', 'adventure', 'travel', 'cooking', 'fitness', 'music', 'gaming', 'lifestyle', 'education', 'other']
  }],
  pricing: {
    subscriptionMonthly: { type: Number, default: 0 },
    subscriptionYearly: { type: Number, default: 0 },
    defaultContentPrice: { type: Number, default: 4.99 }
  },
  stats: {
    totalFollowers: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalStreams: { type: Number, default: 0 },
    totalContent: { type: Number, default: 0 }
  },
  isLive: {
    type: Boolean,
    default: false
  },
  currentStreamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  stripeAccountId: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

providerSchema.index({ 'stats.totalFollowers': -1 });
providerSchema.index({ isLive: 1 });
providerSchema.index({ categories: 1 });

const Provider = mongoose.model('Provider', providerSchema);
module.exports = Provider;
