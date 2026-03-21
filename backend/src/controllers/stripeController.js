import Stripe from 'stripe';
import pool from '../config/database.js';

let _stripe;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function getPriceMap() {
  return {
    starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_1TDUfmPatdzid7LW5Abl1cxs',
    pro: process.env.STRIPE_PRO_PRICE_ID || 'price_1TDUfmPatdzid7LWCIcB02bO',
    agency: process.env.STRIPE_AGENCY_PRICE_ID || 'price_1TDUfnPatdzid7LWzHB94ld0',
  };
}

const PLAN_SCAN_LIMITS = {
  free: 5,
  starter: 50,
  pro: 200,
  agency: 999999,
};

// Map a Stripe price ID back to a plan name
function priceToPlan(priceId) {
  for (const [plan, pid] of Object.entries(getPriceMap())) {
    if (pid === priceId) return plan;
  }
  return null;
}

// ── Create Checkout Session ──────────────────────────────────────────
export const createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    const PLAN_PRICE_MAP = getPriceMap();
    const stripe = getStripe();
    if (!plan || !PLAN_PRICE_MAP[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Choose starter, pro, or agency.' });
    }

    const user = req.user;

    // Reuse or create a Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PLAN_PRICE_MAP[plan], quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: { userId: String(user.id), plan },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe createCheckoutSession error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

// ── Create Billing Portal Session ────────────────────────────────────
export const createBillingPortalSession = async (req, res) => {
  try {
    const stripe = getStripe();
    const user = req.user;
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe createBillingPortalSession error:', err);
    return res.status(500).json({ error: 'Failed to create billing portal session' });
  }
};

// ── Webhook Handler ──────────────────────────────────────────────────
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  const stripe = getStripe();
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (userId && plan) {
          const scanLimit = PLAN_SCAN_LIMITS[plan] || 5;
          await pool.query(
            'UPDATE users SET plan = $1, scans_limit = $2, stripe_customer_id = $3 WHERE id = $4',
            [plan, scanLimit, customerId, userId]
          );

          // Fetch subscription details from Stripe for period dates
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await pool.query(
            `INSERT INTO subscriptions (user_id, plan, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end)
             VALUES ($1, $2, $3, $4, 'active', to_timestamp($5), to_timestamp($6))
             ON CONFLICT (stripe_subscription_id) DO UPDATE SET
               plan = EXCLUDED.plan, status = 'active',
               current_period_start = EXCLUDED.current_period_start,
               current_period_end = EXCLUDED.current_period_end`,
            [userId, plan, subscriptionId, customerId, sub.current_period_start, sub.current_period_end]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = priceToPlan(priceId);
        const status = sub.cancel_at_period_end ? 'canceled' : sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'active';

        // Update subscription record
        await pool.query(
          `UPDATE subscriptions SET plan = COALESCE($1, plan), status = $2,
             current_period_start = to_timestamp($3), current_period_end = to_timestamp($4)
           WHERE stripe_subscription_id = $5`,
          [plan, status, sub.current_period_start, sub.current_period_end, sub.id]
        );

        // Update user plan & limits if plan changed
        if (plan) {
          const scanLimit = PLAN_SCAN_LIMITS[plan] || 5;
          const userResult = await pool.query(
            'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
            [sub.id]
          );
          if (userResult.rows.length > 0) {
            await pool.query(
              'UPDATE users SET plan = $1, scans_limit = $2 WHERE id = $3',
              [plan, scanLimit, userResult.rows[0].user_id]
            );
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          `UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = $1`,
          [sub.id]
        );

        const userResult = await pool.query(
          'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
          [sub.id]
        );
        if (userResult.rows.length > 0) {
          await pool.query(
            "UPDATE users SET plan = 'free', scans_limit = $1 WHERE id = $2",
            [PLAN_SCAN_LIMITS.free, userResult.rows[0].user_id]
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await pool.query(
            `UPDATE subscriptions SET current_period_start = to_timestamp($1), current_period_end = to_timestamp($2), status = 'active'
             WHERE stripe_subscription_id = $3`,
            [sub.current_period_start, sub.current_period_end, invoice.subscription]
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Mark subscription as past_due
        if (invoice.subscription) {
          await pool.query(
            `UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1`,
            [invoice.subscription]
          );
        }

        // Send notification email to the customer
        const userResult = await pool.query(
          'SELECT email, name FROM users WHERE stripe_customer_id = $1',
          [customerId]
        );
        if (userResult.rows.length > 0) {
          const { email, name } = userResult.rows[0];
          console.warn(`Payment failed for user ${email} (${name}). Invoice: ${invoice.id}`);
          // Email notification could be added here using your email utility
        }
        break;
      }

      default:
        // Unhandled event type – ignore
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    // Return 200 anyway so Stripe doesn't retry endlessly
  }

  return res.json({ received: true });
};
