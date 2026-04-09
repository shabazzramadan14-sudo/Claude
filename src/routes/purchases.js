const express = require('express');
const { body, validationResult } = require('express-validator');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const Stream = require('../models/Stream');
const Content = require('../models/Content');
const Provider = require('../models/Provider');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');
const PaymentService = require('../services/payment');

const router = express.Router();

// POST /api/purchases — purchase a stream or content item
router.post('/', authenticate, [
  body('itemType').isIn(['stream', 'content']),
  body('itemId').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { itemType, itemId } = req.body;
  try {
    // Load the item
    let item, provider;
    if (itemType === 'stream') {
      item = await Stream.findById(itemId).populate('provider');
      if (!item) return res.status(404).json({ message: 'Stream not found' });
      provider = item.provider;
    } else {
      item = await Content.findById(itemId).populate('provider');
      if (!item) return res.status(404).json({ message: 'Content not found' });
      provider = item.provider;
    }

    if (item.pricing.isFree) {
      return res.status(400).json({ message: 'This item is free — no purchase required' });
    }

    // Check if already purchased
    const alreadyPurchased = await Purchase.hasAccess(req.user._id, item._id, itemType);
    if (alreadyPurchased) {
      return res.status(409).json({ message: 'Already purchased' });
    }

    const amount = item.pricing.price;

    // Create Stripe PaymentIntent
    const intentData = await PaymentService.createPurchaseIntent({
      user: req.user,
      provider,
      itemType,
      item,
      amount
    });

    // Create pending purchase record
    const purchase = await Purchase.create({
      user: req.user._id,
      provider: provider._id,
      itemType,
      stream: itemType === 'stream' ? item._id : undefined,
      content: itemType === 'content' ? item._id : undefined,
      payment: {
        amount: intentData.amount / 100,
        currency: item.pricing.currency || 'usd',
        stripePaymentIntentId: intentData.paymentIntentId,
        status: 'pending'
      },
      providerEarning: {
        amount: intentData.providerEarning / 100,
        platformFee: intentData.platformFee / 100
      }
    });

    res.status(201).json({
      purchaseId: purchase._id,
      clientSecret: intentData.clientSecret,
      amount: intentData.amount,
      currency: item.pricing.currency || 'usd'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to initiate purchase' });
  }
});

// POST /api/purchases/:id/confirm — confirm payment success (called after Stripe Elements confirm)
router.post('/:id/confirm', authenticate, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    if (!purchase.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Verify with Stripe
    const intent = await PaymentService.getPaymentIntent(purchase.payment.stripePaymentIntentId);
    if (intent.status !== 'succeeded') {
      purchase.payment.status = 'failed';
      await purchase.save();
      return res.status(400).json({ message: 'Payment not confirmed by Stripe' });
    }

    purchase.payment.status = 'succeeded';
    purchase.payment.stripeChargeId = intent.latest_charge || '';
    purchase.payment.paidAt = new Date();
    purchase.access.grantedAt = new Date();
    await purchase.save();

    // Update item stats
    if (purchase.itemType === 'stream') {
      await Stream.findByIdAndUpdate(purchase.stream, {
        $inc: { 'stats.purchaseCount': 1, 'stats.totalRevenue': purchase.payment.amount }
      });
    } else {
      await Content.findByIdAndUpdate(purchase.content, {
        $inc: { 'stats.purchaseCount': 1, 'stats.totalRevenue': purchase.payment.amount }
      });
    }

    // Update provider earnings
    await Provider.findByIdAndUpdate(purchase.provider, {
      $inc: { 'stats.totalEarnings': purchase.providerEarning.amount }
    });

    // Send confirmation notification
    await Notification.create({
      userId: req.user._id,
      type: 'purchase-success',
      title: 'Purchase successful!',
      message: `You now have access to the content. Enjoy!`,
      providerId: purchase.provider
    });

    res.json({ message: 'Purchase confirmed', purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to confirm purchase' });
  }
});

// POST /api/purchases/webhook — Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = PaymentService.constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const purchase = await Purchase.findOne({ 'payment.stripePaymentIntentId': intent.id });
    if (purchase && purchase.payment.status !== 'succeeded') {
      purchase.payment.status = 'succeeded';
      purchase.payment.paidAt = new Date();
      purchase.access.grantedAt = new Date();
      await purchase.save();
    }
  }

  res.json({ received: true });
});

// GET /api/purchases/my — list current user's purchases
router.get('/my', authenticate, async (req, res) => {
  try {
    const purchases = await Purchase.find({
      user: req.user._id,
      'payment.status': 'succeeded'
    })
      .populate('stream', 'title thumbnail argoLive.hlsPlaybackUrl')
      .populate('content', 'title video.thumbnailUrl video.url')
      .populate('provider', 'stageName avatar')
      .sort({ createdAt: -1 });

    res.json({ purchases });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch purchases' });
  }
});

// POST /api/purchases/subscribe — subscribe to a provider
router.post('/subscribe', authenticate, [
  body('providerId').notEmpty(),
  body('plan').isIn(['monthly', 'yearly'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { providerId, plan } = req.body;
  try {
    const provider = await Provider.findById(providerId);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    // Check for existing active sub
    const existingSub = await Subscription.isActiveSubscriber(req.user._id, providerId);
    if (existingSub) return res.status(409).json({ message: 'Already subscribed' });

    const subData = await PaymentService.createSubscription({
      user: req.user,
      provider,
      plan
    });

    const subscription = await Subscription.create({
      user: req.user._id,
      provider: provider._id,
      plan,
      status: 'active',
      payment: {
        amount: subData.amount / 100,
        stripeSubscriptionId: subData.stripeSubscriptionId,
        stripeCustomerId: subData.stripeCustomerId
      },
      currentPeriod: {
        start: subData.currentPeriodStart,
        end: subData.currentPeriodEnd
      },
      providerEarning: {
        amount: subData.providerEarning / 100,
        platformFee: subData.platformFee / 100
      }
    });

    res.status(201).json({ subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
});

module.exports = router;
