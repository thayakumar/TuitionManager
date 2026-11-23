# Architecture verification — 23 November 2026

All three selected improvements are implemented: invoice generation, attachment transfer authority and submitted-work retrieval. See [implementation details](../../../docs/ARCHITECTURE-REFACTOR.md) and [business glossary](../../../GLOSSARY.md).

Baseline: `341aa9a`. No database schema migration or new provider was introduced. Existing manual-versus-monthly invoice policies, role authorization, parent-link behavior and latest-attempt grading controls remain intact.

## Executed verification

- `npm test`: **143 passed, 0 failed**. Named results are in `scenario-results.json`.
- `npm run build`: production compilation and TypeScript checks passed.
- Local HTTP run: **977 successful requests/checks**, including role pages, access rejection, concurrent reads, duplicate sends, diagnostic revision conflicts and malformed bodies. See `http-load-results.json`.
- Browser route sweep: **96 desktop/mobile views**, **0 overflow failures**, **0 runtime errors**. See `ui-matrix-final.json`.
- Tutor/student gradebook snapshots retain the recorded maximum after assignment points change. See `gradebook-snapshot-after.json`. Both post detail views also show the saved75/100 while the tutor grade form retains the current200-point rubric; see `post-work-browser.json`.

The new automated cases cover manual/automatic generation races through the public operations, cross-month rollback, invalid student identifiers, legacy/offset timestamps under a non-UTC server, parent revocation and transfer registration, active post ownership, current/history snapshot consistency, file-only work, grading maxima and legacy records. Retrieval tests use real SQLite. Presentation tests stub the returned work model; they do not pretend to be browser interactions.

Fixtures contain synthetic data only. Load and browser tests target a separate local database; video/storage responses are controlled where used. These results are not a production capacity claim or proof of live Google Drive permissions. No fake business records, invoices or live uploads were created in production.

The original audit harness is retained under `../2026-11-19-stress/harness`; this run uses a separate fixture directory `/workspace/scratch/architecture-20261123` and the current application modules. The current production build and tests require no private diagnostic question bank in source.
