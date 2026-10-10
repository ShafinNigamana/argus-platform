-- Argus Platform — Migration V3
-- Persistent distributed abuse protection & rate limiting for public auth endpoints (multi-instance safe)

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_key         VARCHAR(255) NOT NULL,
    action_type      VARCHAR(50)  NOT NULL,
    attempts         INTEGER      NOT NULL DEFAULT 1,
    first_attempt_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_attempt_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    blocked_until    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_rate_limits_key_action ON auth_rate_limits(rate_key, action_type);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked_until ON auth_rate_limits(blocked_until);
