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
| React web portal | In Progress | Frontend member | Member-owned; frontend contract published at Docs/coordination/API_CONTRACT.md. |
| ML / AI verification work | In Progress | ML member | Member-owned; ML ingestion/fusion contract published at Docs/coordination/ML_INTEGRATION.md. |
| Backend/API | Verified | Team lead | Aligned to TDD §4.1 REST contracts; DTOs, exception handling, rate limiting implemented & verified. |
| PostgreSQL/database | Verified | Team lead | JPA entities, Flyway V1 migration script, repositories implemented & verified. |
| Authentication/RBAC | Verified | Team lead | Spring Security 6, JWT filter, AppUserDetailsService, RBAC roles (ADMIN, AUDIT, SUPERADMIN, USER) verified. |
| Audit logging | Verified | Team lead | Immutable write-only structured event logger with IP/user/resource tracking verified. |
| Digital trust / certificates | Verified | Team lead | Asymmetric Cloud KMS signing with SHA-256 fallback & canonical verification certificate generation verified. |
| Cloud/deployment/CI/CD | Verified | Team lead | Temurin JRE 17 Dockerfile, Cloud Build pipeline, GitHub Actions CI workflow, and prod configuration created. |
| Frontend–backend integration | Ready for Review | Team lead | Documented API contract ready for frontend consumption; awaits frontend branch review. |
| ML–backend integration | Ready for Review | Team lead | Documented ML contract and scoring fusion orchestrator ready; awaits ML branch review. |
| End-to-end testing | In Progress | Team lead | 48/48 backend unit, repository, security, and integration tests verified and passing. |

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
| 2026-10-05 | Completed Phases 1-10: PostgreSQL persistence, Security/JWT, TDD §4.1 APIs, Audit logging, KMS digital trust, Rate limiting, Docker/CI-CD, API/ML integration contracts, and 48 passing test suites. | Team Lead |
