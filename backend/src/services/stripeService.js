const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

// Check if we should use mock mode (when Stripe key is not set or is 'sk_test_mock')
const USE_MOCK = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock';

// Store mock sessions for retrieval
const mockSessions = new Map();

/**
 * Create a mock Stripe checkout session (for development)
 */
function createMockCheckoutSession(question) {
  const sessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15);

  const session = {
    id: sessionId,
    url: `${process.env.FRONTEND_URL}/thanks.html?session_id=${sessionId}&question_id=${question.id}&mock=true`,
    payment_status: 'paid', // Mock as already paid
    metadata: {
      question_id: question.id,
    },
    amount_total: question.price_cents,
    currency: 'usd'
  };

  // Store for later retrieval
  mockSessions.set(sessionId, session);

  console.log('📝 Using MOCK Stripe session (no real payment)');
  return { success: true, session };
}

/**
 * Create a Stripe checkout session
 */
async function createCheckoutSession(question) {
  // Use mock in development or when Stripe is not configured
  if (USE_MOCK) {
    return createMockCheckoutSession(question);
  }

  try {
    // In test mode with real Stripe credentials
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Ask YaGuy - ${question.urgency === 'urgent' ? 'Urgent' : 'Standard'} Answer`,
              description: question.title,
            },
            unit_amount: question.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/thanks.html?session_id={CHECKOUT_SESSION_ID}&question_id=${question.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/ask.html`,
      metadata: {
        question_id: question.id,
      },
    });

    return { success: true, session };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve a checkout session
 */
async function getCheckoutSession(sessionId) {
  // Return mock session if it exists
  if (USE_MOCK && mockSessions.has(sessionId)) {
    return { success: true, session: mockSessions.get(sessionId) };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { success: true, session };
  } catch (error) {
    console.error('Stripe session retrieval error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a refund
 */
async function createRefund(paymentIntentId, amount = null) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // If null, refunds the full amount
    });

    return { success: true, refund };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('No Stripe webhook secret configured');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

module.exports = {
  createCheckoutSession,
  getCheckoutSession,
  createRefund,
  verifyWebhookSignature
};
