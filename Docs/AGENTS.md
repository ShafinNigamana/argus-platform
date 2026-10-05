# Argus Platform — Agent Instructions

Before changing code, read:

1. `status.md`
2. `docs/README.md`
3. `docs/01_Argus_Vision_Document.md`
4. `docs/02_Argus_Product_Requirements_Document.md`
5. `docs/03_Argus_Technical_Design_Document.md`
6. `docs/04_Argus_SGP_Discussion.md`
7. `docs/SKILLS.md`
8. `coordination/ANTIGRAVITY_MASTER_PROMPT.md` when acting as Team Lead.

## Non-negotiable coordination rules

- Do not assume a feature is missing just because it is not present on the current branch.
- Check `status.md` and inspect the repository first.
- Frontend work belongs to the frontend member's branch.
- ML/AI work belongs to the ML member's branch.
- Do not recreate or replace either member's work.
- The Team Lead owns backend, API, database, integration, security, trust, cloud, CI/CD, and final review/merge coordination.
- Do not merge another member's branch without review.
- `status.md` is Team Lead owned and should be read-only for feature branches.
- Do not invent requirements, APIs, database fields, metrics, model behavior, or infrastructure that are not supported by the project documents or an explicit team decision.
- If a requirement is ambiguous, mark it `TBD` and ask the Team Lead rather than guessing.
