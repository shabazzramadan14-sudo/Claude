const express = require('express');
const Follow = require('../models/Follow');
const Provider = require('../models/Provider');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/follows/:providerId — follow a provider
router.post('/:providerId', authenticate, async (req, res) => {
  const { providerId } = req.params;
  try {
    const provider = await Provider.findById(providerId);
    if (!provider || !provider.isActive) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Prevent providers from following themselves
    const isOwnProfile = provider.user.equals(req.user._id);
    if (isOwnProfile) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      provider: providerId
    });

    if (existingFollow) {
      return res.status(409).json({ message: 'Already following this provider' });
    }

    const { notifications } = req.body;
    const follow = await Follow.create({
      follower: req.user._id,
      provider: providerId,
      notifications: notifications || { onLive: true, onNewContent: true, onScheduled: false }
    });

    // Increment follower count
    await Provider.findByIdAndUpdate(providerId, {
      $inc: { 'stats.totalFollowers': 1 }
    });

    res.status(201).json({ follow, isFollowing: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to follow provider' });
  }
});

// DELETE /api/follows/:providerId — unfollow a provider
router.delete('/:providerId', authenticate, async (req, res) => {
  const { providerId } = req.params;
  try {
    const follow = await Follow.findOneAndDelete({
      follower: req.user._id,
      provider: providerId
    });

    if (!follow) {
      return res.status(404).json({ message: 'Not following this provider' });
    }

    await Provider.findByIdAndUpdate(providerId, {
      $inc: { 'stats.totalFollowers': -1 }
    });

    res.json({ message: 'Unfollowed', isFollowing: false });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unfollow' });
  }
});

// GET /api/follows/me — list all providers the current user follows
router.get('/me', authenticate, async (req, res) => {
  try {
    const follows = await Follow.find({ follower: req.user._id })
      .populate('provider', 'stageName avatar isLive isVerified stats.totalFollowers')
      .sort({ createdAt: -1 });

    res.json({ follows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch follows' });
  }
});

// GET /api/follows/:providerId/status — check if current user follows a provider
router.get('/:providerId/status', authenticate, async (req, res) => {
  try {
    const follow = await Follow.findOne({
      follower: req.user._id,
      provider: req.params.providerId
    });
    res.json({ isFollowing: !!follow, follow: follow || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/follows/:providerId/notifications — update notification prefs for a follow
router.patch('/:providerId/notifications', authenticate, async (req, res) => {
  try {
    const follow = await Follow.findOneAndUpdate(
      { follower: req.user._id, provider: req.params.providerId },
      { notifications: req.body.notifications },
      { new: true }
    );
    if (!follow) return res.status(404).json({ message: 'Not following this provider' });
    res.json({ follow });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

module.exports = router;
