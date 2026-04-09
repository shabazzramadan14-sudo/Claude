const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Platform fee percentage (e.g. 20%)
const PLATFORM_FEE_PERCENT = 0.20;

/**
 * Payment Service — wraps Stripe for:
 * - One-time content/stream purchases
 * - Provider subscription plans
 * - Stripe Connect for provider payouts
 */
const PaymentService = {

  /**
   * Create or retrieve a Stripe customer for a user.
   */
  async getOrCreateCustomer(user) {
    if (user.stripeCustomerId) {
      return stripe.customers.retrieve(user.stripeCustomerId);
    }
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName || user.username,
      metadata: { userId: user._id.toString() }
    });
    user.stripeCustomerId = customer.id;
    await user.save();
    return customer;
  },

  /**
   * Create a PaymentIntent for purchasing a stream or content item.
   * Returns client_secret for frontend Stripe Elements confirmation.
   */
  async createPurchaseIntent({ user, provider, itemType, item, amount, currency = 'usd' }) {
    const customer = await this.getOrCreateCustomer(user);

    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT * 100); // in cents
    const totalAmount = Math.round(amount * 100); // in cents

    const paymentIntentParams = {
      amount: totalAmount,
      currency,
      customer: customer.id,
      metadata: {
        userId: user._id.toString(),
        providerId: provider._id.toString(),
        itemType,
        itemId: item._id.toString()
      },
      description: `POV Shades — ${item.title || 'Content Purchase'}`
    };

    // If the provider has a connected Stripe account, use transfer_data
    if (provider.stripeAccountId) {
      paymentIntentParams.application_fee_amount = platformFee;
      paymentIntentParams.transfer_data = {
        destination: provider.stripeAccountId
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      platformFee,
      providerEarning: totalAmount - platformFee
    };
  },

  /**
   * Create a Stripe subscription for a provider plan.
   */
  async createSubscription({ user, provider, plan }) {
    const customer = await this.getOrCreateCustomer(user);

    const amount = plan === 'yearly'
      ? Math.round(provider.pricing.subscriptionYearly * 100)
      : Math.round(provider.pricing.subscriptionMonthly * 100);

    if (amount === 0) {
      throw new Error('Provider has not set subscription pricing');
    }

    // Create a one-off price for this provider's plan
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval: plan === 'yearly' ? 'year' : 'month' },
      product_data: {
        name: `${provider.stageName} — ${plan} subscription`
      }
    });

    const subscriptionParams = {
      customer: customer.id,
      items: [{ price: price.id }],
      metadata: {
        userId: user._id.toString(),
        providerId: provider._id.toString(),
        plan
      }
    };

    if (provider.stripeAccountId) {
      subscriptionParams.application_fee_percent = PLATFORM_FEE_PERCENT * 100;
      subscriptionParams.transfer_data = {
        destination: provider.stripeAccountId
      };
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);
    return {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
      amount,
      platformFee: Math.round(amount * PLATFORM_FEE_PERCENT),
      providerEarning: Math.round(amount * (1 - PLATFORM_FEE_PERCENT)),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    };
  },

  /**
   * Cancel a Stripe subscription at period end.
   */
  async cancelSubscription(stripeSubscriptionId) {
    return stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true
    });
  },

  /**
   * Retrieve payment intent status (for webhook processing).
   */
  async getPaymentIntent(paymentIntentId) {
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },

  /**
   * Construct a Stripe webhook event from raw body + signature.
   */
  constructWebhookEvent(rawBody, signature) {
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  },

  /**
   * Create a Stripe Connect account for a provider so they can receive payouts.
   */
  async createProviderAccount(provider, user) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      metadata: { providerId: provider._id.toString() }
    });
    return account.id;
  },

  /**
   * Generate an onboarding link for a provider's Stripe Connect account.
   */
  async createProviderAccountLink(stripeAccountId, returnUrl, refreshUrl) {
    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });
    return link.url;
  }
};

module.exports = PaymentService;
