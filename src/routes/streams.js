const express = require('express');
const { body, validationResult } = require('express-validator');
const Stream = require('../models/Stream');
const Provider = require('../models/Provider');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const { authenticate, requireProvider, optionalAuth } = require('../middleware/auth');
const argoLive = require('../services/argolive');

const router = express.Router();

// GET /api/streams — public feed of live and recent streams
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, category, provider, page = 1, limit = 20 } = req.query;
    const filter = { status: { $in: ['live', 'ready'] }, isPublic: true };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (provider) filter.provider = provider;

    const streams = await Stream.find(filter)
      .populate('provider', 'stageName avatar isLive isVerified')
      .sort({ status: -1, createdAt: -1 })  // live first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mask playback URL for paid streams unless user has access
    const userId = req.user?._id;
    const enriched = await Promise.all(streams.map(async (s) => {
      const obj = s.toObject();
      if (!s.pricing.isFree && userId) {
        const hasAccess = await Purchase.hasAccess(userId, s._id, 'stream');
        const isSubscriber = s.pricing.requiresSubscription
          ? await Subscription.isActiveSubscriber(userId, s.provider._id)
          : false;
        obj.hasAccess = hasAccess || isSubscriber;
      } else {
        obj.hasAccess = s.pricing.isFree;
      }
      if (!obj.hasAccess) {
        delete obj.argoLive.streamKey;
        obj.argoLive.hlsPlaybackUrl = '';  // hide URL until purchased
      }
      return obj;
    }));

    const total = await Stream.countDocuments(filter);
    res.json({ streams: enriched, total, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch streams' });
  }
});

// GET /api/streams/:id — get single stream
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id)
      .populate('provider', 'stageName avatar isLive isVerified bio categories argoLive');
    if (!stream) return res.status(404).json({ message: 'Stream not found' });

    const userId = req.user?._id;
    let hasAccess = stream.pricing.isFree;

    if (!hasAccess && userId) {
      hasAccess = await Purchase.hasAccess(userId, stream._id, 'stream');
      if (!hasAccess && stream.pricing.requiresSubscription) {
        hasAccess = await Subscription.isActiveSubscriber(userId, stream.provider._id);
      }
    }

    const obj = stream.toObject();
    obj.hasAccess = hasAccess;

    if (!hasAccess) {
      delete obj.argoLive.streamKey;
      obj.argoLive.hlsPlaybackUrl = '';
    }

    res.json({ stream: obj });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stream' });
  }
});

// POST /api/streams — provider creates a new stream (live or prerecorded)
router.post('/', authenticate, requireProvider, [
  body('title').trim().notEmpty().isLength({ max: 100 }),
  body('type').isIn(['live', 'prerecorded']),
  body('category').optional().isString(),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('pricing').optional().isObject(),
  body('scheduledAt').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const { title, type, category, description, pricing, scheduledAt, tags } = req.body;

    const stream = await Stream.create({
      provider: provider._id,
      title,
      type,
      category: category || 'other',
      description,
      pricing: pricing || { isFree: false, price: provider.pricing.defaultContentPrice },
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      tags: tags || [],
      status: type === 'live' ? 'scheduled' : 'processing'
    });

    // For live streams, provision ArgoLive immediately
    if (type === 'live' && provider.argoLive.channelId) {
      const liveData = await argoLive.startLiveStream(
        provider.argoLive.channelId,
        stream._id.toString(),
        title
      );
      stream.argoLive = {
        streamId: liveData.argoStreamId,
        channelId: provider.argoLive.channelId,
        rtmpIngestUrl: liveData.rtmpIngestUrl,
        streamKey: provider.argoLive.streamKey,
        hlsPlaybackUrl: liveData.hlsPlaybackUrl
      };
      stream.status = 'live';
      stream.startedAt = new Date();
      await stream.save();

      // Mark provider as live
      provider.isLive = true;
      provider.currentStreamId = stream._id;
      provider.stats.totalStreams += 1;
      await provider.save();

      // Notify all followers
      const followers = await Follow.find({
        provider: provider._id,
        'notifications.onLive': true
      }).select('follower');

      const notifications = followers.map((f) => ({
        userId: f.follower,
        type: 'stream-started',
        title: `${provider.stageName} is live!`,
        message: `${provider.stageName} just started a new POV stream: "${title}"`,
        relatedStreamId: stream._id,
        providerId: provider._id
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      // Emit socket event (io is attached to req via server.js)
      if (req.io) {
        req.io.to(`provider_${provider._id}`).emit('providerLive', {
          providerId: provider._id,
          streamId: stream._id,
          title
        });
      }
    }

    res.status(201).json({ stream });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create stream' });
  }
});

// POST /api/streams/:id/end — provider ends a live stream
router.post('/:id/end', authenticate, requireProvider, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || !stream.provider.equals(provider._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    stream.status = 'processing';
    stream.endedAt = new Date();
    await stream.save();

    provider.isLive = false;
    provider.currentStreamId = null;
    await provider.save();

    // End stream on ArgoLive and begin recording
    if (stream.argoLive.streamId && provider.argoLive.channelId) {
      await argoLive.endLiveStream(provider.argoLive.channelId, stream.argoLive.streamId);
    }

    // Emit to all viewers in the stream room
    if (req.io) {
      req.io.to(`stream_${stream._id}`).emit('streamEnded', { streamId: stream._id });
    }

    res.json({ message: 'Stream ended', stream });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to end stream' });
  }
});

// GET /api/streams/:id/viewers — current viewer count (live streams)
router.get('/:id/viewers', async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).select('stats.currentViewers');
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    res.json({ count: stream.stats.currentViewers });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/streams/:id — provider updates stream metadata
router.patch('/:id', authenticate, requireProvider, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || !stream.provider.equals(provider._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { title, description, thumbnail, category, pricing, tags } = req.body;
    if (title) stream.title = title;
    if (description !== undefined) stream.description = description;
    if (thumbnail) stream.thumbnail = thumbnail;
    if (category) stream.category = category;
    if (pricing) stream.pricing = { ...stream.pricing, ...pricing };
    if (tags) stream.tags = tags;

    await stream.save();
    res.json({ stream });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update stream' });
  }
});

module.exports = router;
