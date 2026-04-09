const express = require('express');
const router = express.Router();

// Mock data for notifications
let notifications = [
    { id: 1, message: 'Notification 1', read: false },
    { id: 2, message: 'Notification 2', read: false },
    { id: 3, message: 'Notification 3', read: false },
    { id: 4, message: 'Notification 4', read: true }
];

// GET endpoint for user notifications with pagination
router.get('/notifications', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    if (endIndex < notifications.length) {
        results.next = {
            page: page + 1,
            limit: limit
        };
    }
    if (startIndex > 0) {
        results.previous = {
            page: page - 1,
            limit: limit
        };
    }

    results.results = notifications.slice(startIndex, endIndex);
    results.unreadCount = notifications.filter(n => !n.read).length;
    res.json(results);
});

// PATCH endpoint to mark single notification as read
router.patch('/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const notification = notifications.find(n => n.id === parseInt(id));

    if (notification) {
        notification.read = true;
        return res.status(200).json({ message: 'Notification marked as read', notification });
    } else {
        return res.status(404).json({ message: 'Notification not found' });
    }
});

// PATCH endpoint to mark all notifications as read
router.patch('/notifications/read', (req, res) => {
    notifications.forEach(n => n.read = true);
    res.status(200).json({ message: 'All notifications marked as read' });
});

module.exports = router;