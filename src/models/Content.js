const mongoose = require('mongoose');

// Content represents uploaded/prerecorded POV videos separate from live streams
const contentSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  contentType: {
    type: String,
    enum: ['vod', 'clip', 'highlight', 'series-episode'],
    default: 'vod'
  },
  // Video source on ArgoLive CDN
  video: {
    url: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    previewUrl: { type: String, default: '' },  // 30-second free preview
    duration: { type: Number, default: 0 },     // seconds
    resolution: { type: String, default: '1080p' },
    fileSize: { type: Number, default: 0 }
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
    purchaseCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  },
  // Series support
  series: {
    name: { type: String, default: '' },
    episode: { type: Number, default: 0 },
    season: { type: Number, default: 1 }
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

contentSchema.index({ provider: 1, isPublished: 1 });
contentSchema.index({ category: 1 });
contentSchema.index({ 'pricing.isFree': 1 });
contentSchema.index({ publishedAt: -1 });

const Content = mongoose.model('Content', contentSchema);
module.exports = Content;
