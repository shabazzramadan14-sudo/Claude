const express = require('express');
const { body, validationResult } = require('express-validator');
const Provider = require('../models/Provider');
const Stream = require('../models/Stream');
const Content = require('../models/Content');
const Follow = require('../models/Follow');
const { authenticate, requireProvider } = require('../middleware/auth');
const argoLive = require('../services/argolive');
const PaymentService = require('../services/payment');

const router = express.Router();

// GET /api/providers — browse all providers (with filters)
router.get('/', async (req, res) => {
  try {
    const { category, live, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (category) filter.categories = category;
    if (live === 'true') filter.isLive = true;
    if (search) {
      filter.$or = [
        { stageName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    const providers = await Provider.find(filter)
      .populate('user', 'username avatar')
      .sort({ isLive: -1, 'stats.totalFollowers': -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Provider.countDocuments(filter);
    res.json({ providers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch providers' });
  }
});

// GET /api/providers/:id — get a provider's public profile
router.get('/:id', async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('user', 'username avatar displayName createdAt');
    if (!provider || !provider.isActive) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Recent content
    const recentContent = await Content.find({ provider: provider._id, isPublished: true })
      .sort({ publishedAt: -1 }).limit(6);

    // Recent/live streams
    const streams = await Stream.find({
      provider: provider._id,
      status: { $in: ['live', 'ready'] }
    }).sort({ createdAt: -1 }).limit(6);

    res.json({ provider, recentContent, streams });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch provider' });
  }
});

// PATCH /api/providers/me — update provider profile
router.patch('/me', authenticate, requireProvider, [
  body('stageName').optional().trim().isLength({ min: 1, max: 50 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('categories').optional().isArray(),
  body('pricing').optional().isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider profile not found' });

    const { stageName, bio, avatar, coverImage, categories, pricing } = req.body;
    if (stageName !== undefined) provider.stageName = stageName;
    if (bio !== undefined) provider.bio = bio;
    if (avatar !== undefined) provider.avatar = avatar;
    if (coverImage !== undefined) provider.coverImage = coverImage;
    if (categories !== undefined) provider.categories = categories;
    if (pricing !== undefined) provider.pricing = { ...provider.pricing, ...pricing };

    await provider.save();
    res.json({ provider });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// POST /api/providers/me/connect-argolive
// Register / reconnect a provider's shades device with ArgoLive
router.post('/me/connect-argolive', authenticate, requireProvider, async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const { deviceId, model } = req.body;

    // Create or refresh ArgoLive channel
    const channel = await argoLive.createProviderChannel(
      provider._id.toString(),
      provider.stageName
    );

    provider.argoLive = {
      channelId: channel.id,
      streamKey: channel.streamKey,
      rtmpUrl: channel.rtmpUrl,
      hlsPlaybackUrl: channel.hlsPlaybackUrl,
      isConnected: true
    };

    if (deviceId) {
      provider.shadesDevice = {
        deviceId,
        model: model || 'Unknown Shades',
        isActive: true,
        lastConnected: new Date()
      };
    }

    await provider.save();
    res.json({
      message: 'ArgoLive connected successfully',
      argoLive: {
        channelId: provider.argoLive.channelId,
        rtmpUrl: provider.argoLive.rtmpUrl,
        streamKey: provider.argoLive.streamKey  // provider uses this on their shades device
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to connect ArgoLive' });
  }
});

// GET /api/providers/me/dashboard — provider analytics dashboard
router.get('/me/dashboard', authenticate, requireProvider, async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const [streamCount, contentCount, followerCount] = await Promise.all([
      Stream.countDocuments({ provider: provider._id }),
      Content.countDocuments({ provider: provider._id, isPublished: true }),
      Follow.countDocuments({ provider: provider._id })
    ]);

    const recentStreams = await Stream.find({ provider: provider._id })
      .sort({ createdAt: -1 }).limit(5);

    const recentContent = await Content.find({ provider: provider._id })
      .sort({ createdAt: -1 }).limit(5);

    res.json({
      provider,
      stats: {
        ...provider.stats,
        streamCount,
        contentCount,
        followerCount
      },
      recentStreams,
      recentContent
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard' });
  }
});

// POST /api/providers/me/stripe-onboard — start Stripe Connect onboarding
router.post('/me/stripe-onboard', authenticate, requireProvider, async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    if (!provider.stripeAccountId) {
      const accountId = await PaymentService.createProviderAccount(provider, req.user);
      provider.stripeAccountId = accountId;
      await provider.save();
    }

    const { returnUrl, refreshUrl } = req.body;
    const onboardingUrl = await PaymentService.createProviderAccountLink(
      provider.stripeAccountId,
      returnUrl || `${process.env.CLIENT_URL}/provider/dashboard`,
      refreshUrl || `${process.env.CLIENT_URL}/provider/dashboard`
    );

    res.json({ onboardingUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to start Stripe onboarding' });
  }
});

module.exports = router;
