-- Migration 005: Fix column mismatches between controllers and database schema
-- Adds missing columns that controllers reference but don't exist in the schema

BEGIN;

-- 1. Add website column to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- 2. Add scope column to audits
ALTER TABLE audits ADD COLUMN IF NOT EXISTS scope TEXT;

-- 3. Add organization_id to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id);

-- 4. Add updated_at to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 5. Fix notification_preferences - add missing columns
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS audit_updates BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS finding_alerts BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS compliance_reminders BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS team_mentions BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN DEFAULT false;

-- 6. Add preferences jsonb to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- 7. Add updated_at to organization_members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 8. Fix reports table - add status and created_by
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id);

-- 9. Fix compliance_records - add missing columns
ALTER TABLE compliance_records ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE compliance_records ADD COLUMN IF NOT EXISTS control_ref VARCHAR(100);
ALTER TABLE compliance_records ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE compliance_records ADD COLUMN IF NOT EXISTS notes TEXT;

-- 10. Add notes to risk_assessments
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS notes TEXT;

COMMIT;
