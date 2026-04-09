const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Provider = require('../models/Provider');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 chars'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['viewer', 'provider'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password, displayName, role = 'viewer' } = req.body;
  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ message: 'Email or username already in use' });
    }

    const user = await User.create({ username, email, password, displayName, role });

    // If registering as a provider, create Provider profile
    if (role === 'provider') {
      const { stageName } = req.body;
      if (!stageName) return res.status(400).json({ message: 'stageName is required for providers' });
      await Provider.create({ user: user._id, stageName: stageName || username });
    }

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    // If provider, include their provider profile
    let provider = null;
    if (user.role === 'provider') {
      provider = await Provider.findOne({ user: user._id });
    }

    res.json({ token, user: user.toPublicJSON(), provider });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  let provider = null;
  if (req.user.role === 'provider') {
    provider = await Provider.findOne({ user: req.user._id });
  }
  res.json({ user: req.user, provider });
});

// PATCH /api/auth/me
router.patch('/me', authenticate, [
  body('displayName').optional().trim().isLength({ max: 50 }),
  body('avatar').optional().isURL()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { displayName, avatar } = req.body;
  if (displayName !== undefined) req.user.displayName = displayName;
  if (avatar !== undefined) req.user.avatar = avatar;
  await req.user.save();
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const user = await User.findById(req.user._id);
  const { currentPassword, newPassword } = req.body;
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
