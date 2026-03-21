-- Migration 004: Add superadmin role and supporting tables
-- Safe to run multiple times (uses IF NOT EXISTS)

BEGIN;

-- System settings table for superadmin configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB DEFAULT '{}',
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscription history for tracking plan changes and revenue events
CREATE TABLE IF NOT EXISTS subscription_history (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  plan VARCHAR(50),
  action VARCHAR(50),
  amount INT,
  stripe_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

COMMIT;
