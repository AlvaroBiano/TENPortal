-- TENPortal Full Schema
-- Run: docker exec -i tenportal-postgres psql -U tenportal -d tenportal < 01-schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS tenportal;

-- Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'affiliate', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('course', 'book', 'workshop');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lesson_content_type AS ENUM ('video_embed', 'video_youtube', 'video_uploaded', 'pdf', 'audio');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE tenportal.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenportal.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES tenportal.profiles(id) ON DELETE CASCADE,
    device_hash TEXT NOT NULL,
    device_name TEXT,
    bind_count INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, device_hash)
);

CREATE TABLE tenportal.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    product_type product_type DEFAULT 'course',
    price NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tenportal.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES tenportal.products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenportal.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES tenportal.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_url TEXT,
    description TEXT,
    lesson_type lesson_content_type DEFAULT 'video_embed',
    duration_seconds INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenportal.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES tenportal.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES tenportal.products(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    progress_percent INT DEFAULT 0,
    last_lesson_id UUID,
    origin TEXT DEFAULT 'direct',
    UNIQUE(profile_id, product_id)
);

CREATE TABLE tenportal.progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES tenportal.enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES tenportal.lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    UNIQUE(enrollment_id, lesson_id)
);

CREATE TABLE tenportal.waiting_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    cpf_hash TEXT,
    product_id UUID REFERENCES tenportal.products(id),
    affiliate_id UUID,
    referral_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenportal.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES tenportal.profiles(id) ON DELETE CASCADE,
    commission_percent NUMERIC(5,2) DEFAULT 30.00,
    referral_code TEXT UNIQUE NOT NULL,
    referral_link TEXT,
    total_commission NUMERIC(12,2) DEFAULT 0.00,
    paid_commission NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenportal.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES tenportal.affiliates(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES tenportal.enrollments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES tenportal.products(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    rate_percent NUMERIC(5,2) NOT NULL,
    status commission_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    UNIQUE(affiliate_id, enrollment_id)
);

-- Triggers
CREATE OR REPLACE FUNCTION tenportal.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON tenportal.profiles
    FOR EACH ROW EXECUTE FUNCTION tenportal.set_updated_at();

CREATE OR REPLACE FUNCTION tenportal.update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE v_pid UUID; v_total INT; v_done INT;
BEGIN
    v_pid := COALESCE(NEW.enrollment_id, OLD.enrollment_id);
    SELECT COUNT(*) INTO v_total FROM tenportal.lessons l
    JOIN tenportal.modules m ON l.module_id = m.id
    JOIN tenportal.enrollments e ON m.product_id = e.product_id
    WHERE e.id = v_pid;
    SELECT COUNT(*) INTO v_done FROM tenportal.progress p WHERE p.enrollment_id = v_pid AND p.completed = TRUE;
    UPDATE tenportal.enrollments SET progress_percent = CASE WHEN v_total > 0 THEN (v_done * 100 / v_total)::INT ELSE 0 END WHERE id = v_pid;
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER progress_completed_trigger AFTER INSERT OR UPDATE ON tenportal.progress
    FOR EACH ROW EXECUTE FUNCTION tenportal.update_enrollment_progress();

-- Indexes
CREATE INDEX idx_profiles_email ON tenportal.profiles(email);
CREATE INDEX idx_enrollments_profile ON tenportal.enrollments(profile_id);
CREATE INDEX idx_enrollments_product ON tenportal.enrollments(product_id);
CREATE INDEX idx_progress_enrollment ON tenportal.progress(enrollment_id);
CREATE INDEX idx_lessons_module ON tenportal.lessons(module_id);
CREATE INDEX idx_modules_product ON tenportal.modules(product_id);
CREATE INDEX idx_waiting_list_email ON tenportal.waiting_list(email);
CREATE INDEX idx_affiliates_referral ON tenportal.affiliates(referral_code);
CREATE INDEX idx_commissions_affiliate ON tenportal.commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON tenportal.commissions(status);

-- Seed: workshop inicial
INSERT INTO tenportal.products (title, slug, product_type, price)
VALUES ('Workshop Sucesso e Mentalidade Financeira', 'sucesso-mentalidade-financeira', 'workshop', 397.00)
ON CONFLICT (slug) DO NOTHING;
