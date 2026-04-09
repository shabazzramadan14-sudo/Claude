const express = require('express');
const router = express.Router();
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY'); // Replace with your actual secret key
const Subscription = require('../models/Subscription'); // Assumed model for Subscription
typing const User = require('../models/User'); // Assumed model for User

// POST /subscriptions to create a new subscription
router.post('/subscriptions', async (req, res) => {
    const { userId, planId } = req.body;
    try {
        // Create a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: calcAmount(planId), // function to calculate amount based on plan
            currency: 'usd',
        });

        // Create subscription record in DB
        const subscription = new Subscription({ userId, planId, status: 'active' });
        await subscription.save();

        // Update user stream viewers and provider earnings
        await updateUserAndProvider(userId, planId);

        // Send success notification
        res.status(201).json({ success: true, paymentIntent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /subscriptions for user subscriptions
router.get('/subscriptions/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const subscriptions = await Subscription.find({ userId }).populate('plan');
        res.status(200).json(subscriptions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// GET /stream-access to check if user has access to stream
router.get('/stream-access/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const subscription = await Subscription.findOne({ userId, status: 'active' });
        if (subscription) {
            return res.status(200).json({ access: true });
        } else {
            return res.status(403).json({ access: false, message: 'Access denied' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

function calcAmount(planId) {
    // Logic to calculate the amount based on the plan ID
    return 1000; // Example: Returning fixed amount
}

async function updateUserAndProvider(userId, planId) {
    // Logic to update user statistics and provider earnings
}

module.exports = router;