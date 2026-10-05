# Argus Platform — SGP Project Context

This package is intended to be placed in the `argus-platform` project folder so the development agent can read the project context and coordination rules.

## Important files

- `AGENTS.md` — repository-level agent instructions
- `status.md` — single shared coordination/status file
- `docs/` — project documents converted to Markdown plus skills reference
- `coordination/ANTIGRAVITY_MASTER_PROMPT.md` — Team Lead implementation prompt

## Team separation

- Frontend member: works independently on the React web portal.
- ML member: works independently on ML/AI verification work.
- Team Lead: works on backend/API, database, integration, security, digital trust, cloud/deployment, testing coordination, and final review/merge.

The two member workstreams should not be recreated or overwritten by the Team Lead while they are working independently.
