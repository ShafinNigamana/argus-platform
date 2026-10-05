-- Argus Platform — Initial Schema
-- V1: Four core entities from TDD §3.1
-- Flyway: runs automatically on startup via spring.flyway.enabled=true

-- ============================================================
-- app_users: application users with RBAC roles
-- TDD §5.2: USER / ADMIN / AUDIT / SUPERADMIN
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(150) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,  -- BCrypt-hashed, never plain text
    role        VARCHAR(30)  NOT NULL DEFAULT 'USER',
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- verifications: tracks each verification attempt
-- TDD §3.1.1
-- ============================================================
CREATE TABLE IF NOT EXISTS verifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL,          -- external caller ID (opaque)
    operation_type  VARCHAR(100) NOT NULL,          -- e.g. "HIGH_VALUE_TRANSACTION"
    status          VARCHAR(30)  NOT NULL DEFAULT 'INITIATED',  -- INITIATED | IN_PROGRESS | COMPLETED | FAILED
    confidence_score DOUBLE PRECISION,              -- 0.0 – 100.0
    component_scores JSONB,                         -- {"liveness":0.9,"behavior":0.85,"challenge":1.0}
    metadata        JSONB,                          -- caller-supplied context
    certificate_id  UUID,                           -- FK to verification_certificates (nullable until issued)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verifications_user_id   ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status    ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_created_at ON verifications(created_at DESC);

-- ============================================================
-- audit_logs: immutable compliance trail
-- TDD §3.1.2: immutability_flag, 1-year retention intent
-- NOTE: rows are INSERT-only; UPDATE/DELETE forbidden at app level
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(100) NOT NULL,          -- e.g. "VERIFICATION_INITIATED"
    user_id         VARCHAR(255),                   -- who triggered the event
    resource_id     VARCHAR(255),                   -- verification ID / policy ID etc.
    resource_type   VARCHAR(100),                   -- "VERIFICATION" | "POLICY" | "AUTH" etc.
    action_details  TEXT,                           -- human-readable action summary
    metadata        JSONB,                          -- structured extra context
    ip_address      VARCHAR(45),                    -- IPv4 or IPv6
    immutable       BOOLEAN NOT NULL DEFAULT TRUE,  -- always true; guards against accidental mutation
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- No updated_at: audit logs are never mutated
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type  ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON audit_logs(created_at DESC);

-- ============================================================
-- verification_certificates: cryptographic proof of verification
-- TDD §3.1.3: SHA-256 signed, Cloud KMS backed, revocable
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL,                  -- FK to verifications
    certificate_data JSONB NOT NULL,                -- full certificate JSON payload
    signature       VARCHAR(512) NOT NULL,          -- hex-encoded SHA-256 / KMS signature
    public_key      TEXT,                           -- PEM public key for third-party validation
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    revocation_reason VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_id ON verification_certificates(verification_id);

-- Add FK constraint after both tables exist
ALTER TABLE verifications
    ADD CONSTRAINT fk_verifications_certificate
    FOREIGN KEY (certificate_id) REFERENCES verification_certificates(id)
    DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- policies: organisation-specific verification configuration
-- TDD §3.1.4
-- ============================================================
CREATE TABLE IF NOT EXISTS policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    organisation        VARCHAR(255),
    confidence_threshold DOUBLE PRECISION NOT NULL DEFAULT 80.0,  -- 0-100
    challenge_types     JSONB,                       -- ["HEAD_TURN","BLINK","TEXT_INPUT"]
    max_duration_seconds INTEGER NOT NULL DEFAULT 90,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(active);
