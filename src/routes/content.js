const express = require('express');
const { body, validationResult } = require('express-validator');
const Content = require('../models/Content');
const Provider = require('../models/Provider');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const { authenticate, requireProvider, optionalAuth } = require('../middleware/auth');
const argoLive = require('../services/argolive');

const router = express.Router();

// GET /api/content — browse all published content
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, provider, free, search, page = 1, limit = 20 } = req.query;
    const filter = { isPublished: true };

    if (category) filter.category = category;
    if (provider) filter.provider = provider;
    if (free === 'true') filter['pricing.isFree'] = true;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const contentList = await Content.find(filter)
      .populate('provider', 'stageName avatar isVerified')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const userId = req.user?._id;
    const enriched = await Promise.all(contentList.map(async (c) => {
      const obj = c.toObject();
      let hasAccess = c.pricing.isFree;

      if (!hasAccess && userId) {
        hasAccess = await Purchase.hasAccess(userId, c._id, 'content');
        if (!hasAccess && c.pricing.requiresSubscription) {
          hasAccess = await Subscription.isActiveSubscriber(userId, c.provider);
        }
      }

      obj.hasAccess = hasAccess;
      if (!hasAccess) {
        obj.video.url = '';                  // hide full URL
        obj.video.previewUrl = c.video.previewUrl;  // keep preview
      }
      return obj;
    }));

    const total = await Content.countDocuments(filter);
    res.json({ content: enriched, total, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch content' });
  }
});

// GET /api/content/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('provider', 'stageName avatar isVerified bio categories');
    if (!content || !content.isPublished) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const userId = req.user?._id;
    let hasAccess = content.pricing.isFree;

    if (!hasAccess && userId) {
      hasAccess = await Purchase.hasAccess(userId, content._id, 'content');
      if (!hasAccess && content.pricing.requiresSubscription) {
        hasAccess = await Subscription.isActiveSubscriber(userId, content.provider._id);
      }
    }

    const obj = content.toObject();
    obj.hasAccess = hasAccess;
    if (!hasAccess) {
      obj.video.url = '';
    }

    // Increment view count
    await Content.findByIdAndUpdate(content._id, { $inc: { 'stats.viewCount': 1 } });

    res.json({ content: obj });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch content' });
  }
});

// POST /api/content — provider creates new prerecorded content entry
router.post('/', authenticate, requireProvider, [
  body('title').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().isString(),
  body('pricing').optional().isObject(),
  body('video').isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const { title, description, category, pricing, video, tags, contentType, series } = req.body;

    const content = await Content.create({
      provider: provider._id,
      title,
      description,
      category: category || 'other',
      pricing: pricing || { isFree: false, price: provider.pricing.defaultContentPrice },
      video,
      tags: tags || [],
      contentType: contentType || 'vod',
      series: series || {}
    });

    provider.stats.totalContent += 1;
    await provider.save();

    // Notify followers about new content
    const followers = await Follow.find({
      provider: provider._id,
      'notifications.onNewContent': true
    }).select('follower');

    if (followers.length > 0) {
      const notifications = followers.map((f) => ({
        userId: f.follower,
        type: 'new-content',
        title: `New POV content from ${provider.stageName}`,
        message: `"${title}" is now available`,
        providerId: provider._id
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create content' });
  }
});

// POST /api/content/upload-session — get ArgoLive upload credentials
router.post('/upload-session', authenticate, requireProvider, [
  body('filename').notEmpty(),
  body('contentType').notEmpty(),
  body('title').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    if (!provider.argoLive.channelId) {
      return res.status(400).json({ message: 'ArgoLive not connected. Please connect your shades device first.' });
    }

    const session = await argoLive.createUploadSession(
      provider._id.toString(),
      provider.argoLive.channelId,
      req.body
    );

    res.json({ uploadSession: session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create upload session' });
  }
});

// PATCH /api/content/:id
router.patch('/:id', authenticate, requireProvider, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || !content.provider.equals(provider._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const allowed = ['title', 'description', 'category', 'tags', 'pricing', 'isPublished'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'pricing') {
          content.pricing = { ...content.pricing, ...req.body.pricing };
        } else {
          content[field] = req.body[field];
        }
      }
    });

    await content.save();
    res.json({ content });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update content' });
  }
});

// DELETE /api/content/:id
router.delete('/:id', authenticate, requireProvider, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || !content.provider.equals(provider._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    content.isPublished = false;
    await content.save();
    res.json({ message: 'Content unpublished' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete content' });
  }
});

module.exports = router;
