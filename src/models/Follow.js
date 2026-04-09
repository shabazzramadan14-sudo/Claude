const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  // Notification preferences for this follow
  notifications: {
    onLive: { type: Boolean, default: true },
    onNewContent: { type: Boolean, default: true },
    onScheduled: { type: Boolean, default: false }
  }
}, { timestamps: true });

// A user can only follow a provider once
followSchema.index({ follower: 1, provider: 1 }, { unique: true });
followSchema.index({ provider: 1 });

const Follow = mongoose.model('Follow', followSchema);
module.exports = Follow;
