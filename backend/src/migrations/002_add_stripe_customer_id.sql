-- Add stripe_customer_id columns for Stripe integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add unique constraint on stripe_subscription_id for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
