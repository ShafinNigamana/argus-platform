-- Argus Platform — Migration V2
-- Add organization metadata and user profile fields to app_users

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS full_name             VARCHAR(150),
    ADD COLUMN IF NOT EXISTS organization_name      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS organization_type      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS organization_website   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS industry               VARCHAR(100),
    ADD COLUMN IF NOT EXISTS team_size              VARCHAR(50),
    ADD COLUMN IF NOT EXISTS job_title              VARCHAR(150);

-- Populate default administrator profile for seeded account
UPDATE app_users
SET full_name = 'System Administrator',
    organization_name = 'Argus Security Operations',
    organization_type = 'COMPANY',
    job_title = 'Platform Administrator'
WHERE username = 'admin' AND full_name IS NULL;

-- Populate default user profile for seeded account
UPDATE app_users
SET full_name = 'Standard Operator',
    organization_name = 'Argus Demonstration Unit',
    organization_type = 'INDIVIDUAL',
    job_title = 'Verification Operator'
WHERE username = 'user' AND full_name IS NULL;
