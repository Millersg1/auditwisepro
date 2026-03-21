-- Migration 003: Full Platform Schema for AuditWise Pro
-- Creates all tables needed for the comprehensive audit management platform
-- Safe to run multiple times (uses IF NOT EXISTS and DO $$ blocks)

BEGIN;

-- ============================================================
-- 1. Organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    industry VARCHAR(100),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. Organization Members
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- admin/auditor/member/viewer
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- ============================================================
-- 3. Organization Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_settings (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    default_framework VARCHAR(100),
    notification_email VARCHAR(255),
    branding JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}'
);

-- ============================================================
-- 4. Alter users table - add new columns
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organization_id') THEN
        ALTER TABLE users ADD COLUMN organization_id INT REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'job_title') THEN
        ALTER TABLE users ADD COLUMN job_title VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================
-- 5. Clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    industry VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active/inactive
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. Audit Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_templates (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    framework VARCHAR(100),
    checklist JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 7. Audits
-- ============================================================
CREATE TABLE IF NOT EXISTS audits (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    client_id INT REFERENCES clients(id) ON DELETE SET NULL,
    template_id INT REFERENCES audit_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft/in_progress/review/completed/archived
    priority VARCHAR(20) DEFAULT 'medium', -- low/medium/high/critical
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    due_date DATE,
    completed_at TIMESTAMP,
    score INT,
    findings_count INT DEFAULT 0,
    checklist_progress JSONB DEFAULT '{}',
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. Audit Findings
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_findings (
    id SERIAL PRIMARY KEY,
    audit_id INT REFERENCES audits(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium', -- low/medium/high/critical
    status VARCHAR(50) DEFAULT 'open', -- open/in_progress/resolved/accepted/wont_fix
    category VARCHAR(100),
    recommendation TEXT,
    evidence TEXT,
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 9. Risk Assessments
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    client_id INT REFERENCES clients(id) ON DELETE SET NULL,
    audit_id INT REFERENCES audits(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- operational/financial/compliance/technology/strategic
    likelihood INT CHECK (likelihood >= 1 AND likelihood <= 5),
    impact INT CHECK (impact >= 1 AND impact <= 5),
    risk_score INT GENERATED ALWAYS AS (likelihood * impact) STORED,
    status VARCHAR(50) DEFAULT 'identified', -- identified/analyzing/mitigating/monitoring/closed
    mitigation_strategy TEXT,
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    review_date DATE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 10. Compliance Frameworks
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    version VARCHAR(50),
    total_controls INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 11. Compliance Records
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_records (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id INT REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
    client_id INT REFERENCES clients(id) ON DELETE SET NULL,
    requirement VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'not_started', -- not_started/in_progress/compliant/non_compliant/partially_compliant
    evidence TEXT,
    gap_analysis TEXT,
    remediation_plan TEXT,
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    review_date DATE,
    last_reviewed TIMESTAMP,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 12. Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    client_id INT REFERENCES clients(id) ON DELETE SET NULL,
    audit_id INT REFERENCES audits(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_type VARCHAR(50),
    file_size INT,
    category VARCHAR(100), -- evidence/report/policy/procedure/template/other
    tags TEXT[] DEFAULT '{}',
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 13. Reports
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    audit_id INT REFERENCES audits(id) ON DELETE SET NULL,
    client_id INT REFERENCES clients(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- audit_report/compliance_report/risk_report/executive_summary
    format VARCHAR(20) DEFAULT 'pdf', -- pdf/xlsx
    data JSONB DEFAULT '{}',
    file_url TEXT,
    generated_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 14. Blog Posts
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    content TEXT,
    excerpt TEXT,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft/published/archived
    meta_title VARCHAR(255),
    meta_description TEXT,
    tags TEXT[] DEFAULT '{}',
    featured_image TEXT,
    seo_score INT,
    seo_issues JSONB DEFAULT '[]',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 15. Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- audit_assigned/deadline_approaching/finding_added/mention/compliance_update/risk_alert/comment
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 16. Notification Preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    audit_assigned BOOLEAN DEFAULT true,
    deadline_approaching BOOLEAN DEFAULT true,
    finding_added BOOLEAN DEFAULT true,
    mentions BOOLEAN DEFAULT true,
    compliance_updates BOOLEAN DEFAULT true,
    risk_alerts BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false
);

-- ============================================================
-- 17. Comments
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- audit/finding/risk/compliance
    entity_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 18. Audit Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 19. User Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ============================================================
-- 20. User Profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bio TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    keyboard_shortcuts_enabled BOOLEAN DEFAULT true
);

-- ============================================================
-- 21. User Security Log
-- ============================================================
CREATE TABLE IF NOT EXISTS user_security_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- login/logout/password_change/2fa_enabled/2fa_disabled/failed_login
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

CREATE INDEX IF NOT EXISTS idx_audits_organization_id ON audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_client_id ON audits(client_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_assigned_to ON audits(assigned_to);

CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_id ON audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_severity ON audit_findings(severity);
CREATE INDEX IF NOT EXISTS idx_audit_findings_status ON audit_findings(status);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_organization_id ON risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_client_id ON risk_assessments(client_id);

CREATE INDEX IF NOT EXISTS idx_compliance_records_organization_id ON compliance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_framework_id ON compliance_records(framework_id);

CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_audit_id ON documents(audit_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);

-- ============================================================
-- Seed Data: Compliance Frameworks
-- ============================================================
INSERT INTO compliance_frameworks (name, slug, description, version, total_controls)
VALUES
    ('SOC 2', 'soc-2', 'Service Organization Control 2 - Trust Services Criteria for security, availability, processing integrity, confidentiality, and privacy.', 'Type II', 64),
    ('ISO 27001', 'iso-27001', 'International standard for information security management systems (ISMS).', '2022', 93),
    ('HIPAA', 'hipaa', 'Health Insurance Portability and Accountability Act - standards for protecting sensitive patient health information.', '2013', 75),
    ('GDPR', 'gdpr', 'General Data Protection Regulation - EU regulation on data protection and privacy.', '2018', 99),
    ('PCI DSS', 'pci-dss', 'Payment Card Industry Data Security Standard - security standards for organizations handling credit card data.', '4.0', 64)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
