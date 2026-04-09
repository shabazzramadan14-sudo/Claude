const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['stream-started', 'stream-scheduled', 'new-content', 'purchase-success', 'purchase-failed'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedStreamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream'
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d'
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;