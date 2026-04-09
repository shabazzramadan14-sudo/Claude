const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  type: {
    type: String,
    enum: ['live', 'prerecorded'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'recording', 'processing', 'ready', 'ended', 'failed'],
    default: 'scheduled'
  },
  // ArgoLive stream data
  argoLive: {
    streamId: { type: String, default: '' },
    channelId: { type: String, default: '' },
    rtmpIngestUrl: { type: String, default: '' },
    streamKey: { type: String, default: '' },
    hlsPlaybackUrl: { type: String, default: '' },
    recordingUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    duration: { type: Number, default: 0 },  // seconds
    fileSize: { type: Number, default: 0 }   // bytes
  },
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['sports', 'adventure', 'travel', 'cooking', 'fitness', 'music', 'gaming', 'lifestyle', 'education', 'other'],
    default: 'other'
  },
  tags: [{ type: String, trim: true }],
  pricing: {
    isFree: { type: Boolean, default: false },
    price: { type: Number, default: 4.99 },
    currency: { type: String, default: 'usd' },
    requiresSubscription: { type: Boolean, default: false }
  },
  stats: {
    viewCount: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    currentViewers: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },
  scheduledAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  // POV-specific metadata from shades device
  povMetadata: {
    deviceModel: { type: String, default: '' },
    resolution: { type: String, default: '1080p' },
    frameRate: { type: Number, default: 30 },
    fieldOfView: { type: Number, default: 90 },  // degrees
    stabilized: { type: Boolean, default: true }
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

streamSchema.index({ provider: 1, status: 1 });
streamSchema.index({ status: 1, type: 1 });
streamSchema.index({ 'pricing.isFree': 1 });
streamSchema.index({ createdAt: -1 });

const Stream = mongoose.model('Stream', streamSchema);
module.exports = Stream;
