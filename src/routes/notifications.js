const express = require('express');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — get current user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { userId: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .populate('providerId', 'stageName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read — mark a single notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;