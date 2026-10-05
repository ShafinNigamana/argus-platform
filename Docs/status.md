# Argus Platform — Shared Status

**Purpose:** Single coordination file for the team. Every member should pull the latest `main` branch and read this file before starting work.

## Coordination rule

- This file is **team-lead owned**.
- Frontend and ML members should **read but not edit** `status.md` on their feature branches.
- Feature work stays isolated in the member's branch until reviewed and merged.
- Do not recreate a module because it appears unfinished here. First check ownership and the latest merged code.
- Status is updated by the team lead after review/merge or after an explicit team decision.

## Branch / ownership model

| Workstream | Owner | Working rule |
|---|---|---|
| Frontend / React web portal | Frontend member | Develop independently on the frontend branch. Do not duplicate in another branch. |
| ML / AI verification work | ML member | Develop independently on the ML branch. Do not duplicate in another branch. |
| Backend / API / database / integration | Team lead | Own backend contracts and integration. |
| Security / trust / cloud / CI/CD | Team lead | Own security, cryptographic trust, deployment and infrastructure integration. |
| Final integration / review | Team lead | Review branches before merge into the integration/main path. |

## Current workstream status

| Area | Status | Owner | Notes |
|---|---|---|---|
| React web portal | In progress | Frontend member | Member-owned; do not recreate. |
| ML / AI verification work | In progress | ML member | Member-owned; do not recreate. |
| Backend/API | Lead-owned | Team lead | Implement independently around documented contracts. |
| PostgreSQL/database | Lead-owned | Team lead | Implement according to TDD entities and approved requirements. |
| Authentication/RBAC | Lead-owned | Team lead | Follow PRD/TDD requirements. |
| Audit logging | Lead-owned | Team lead | Follow PRD/TDD requirements. |
| Digital trust / certificates | Lead-owned | Team lead | Follow PRD/TDD requirements. |
| Cloud/deployment/CI/CD | Lead-owned | Team lead | Follow TDD deployment plan. |
| Frontend–backend integration | Pending merge | Team lead | Integrate only after frontend branch review. |
| ML–backend integration | Pending merge | Team lead | Integrate only after ML branch review. |
| End-to-end testing | Pending integration | Team lead | Start after component contracts are stable. |

## Do not duplicate

### Frontend member
Do not recreate backend, database, ML, security, cloud, or trust-layer implementation unless an explicit integration task requires a change.

### ML member
Do not recreate React UI, backend orchestration, database, cloud, or trust-layer implementation unless an explicit integration task requires a change.

### Team lead
Do not rewrite the frontend or ML implementation while those members are working independently. Define interfaces/contracts and integrate after review.

## Status values

Use only these values when updating this file:

- `Not Started`
- `In Progress`
- `Blocked`
- `Ready for Review`
- `Merged`
- `Verified`
- `Deferred`
- `Out of Scope`

## Change log

| Date | Change | Owner |
|---|---|---|
| 2026-10-05 | Initial shared coordination status created for `argus-platform`. | Team Lead |
