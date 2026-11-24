# TuitionHub project guide

Read README.md for setup and docs/USER-CAPABILITIES-AND-TEST-GUIDE.md for current business behavior. Earlier audits and policy decisions are retained under .audit/runs; the November2026 repair decisions supersede earlier latest-replaces/holiday/Late rules.

## Architecture

Next.js15 App Router + React/TypeScript + Tailwind4 + libSQL. lib/db.ts owns versioned, transactional migrations and query helpers. lib/actions.ts is the server mutation boundary; intentional validation errors use lib/action-errors.ts and safe structured action results where appropriate. lib/auth.ts validates real expiring sessions; middleware presence checks are only an early redirect optimization. Every private page must authorize before querying data.

- `lib/invoice-generation.ts` owns manual-range and automatic-month generation, including write transactions, eligibility, billing-month groups, rounded lines and claims. Call its operations rather than selecting lessons or assembling drafts in callers. `lib/monthly-invoices.ts` retains the scheduler window and compatibility export.
- `lib/attachment-transfer.ts` owns current upload actors, origin/session targets, ticket lifecycle and terminal registration/receipts. Upload routes retain multipart/resumable byte transport; `lib/upload-authority.ts` owns signed ticket/receipt primitives. Preserve their existing parent-link versus student-account distinctions.
- `lib/submitted-work.ts` owns scoped post work retrieval, with current projection and attempt lineage read together. Tutor/student pages authorize first and keep their distinct controls. Attempt types belong to `lib/types.ts`, not presentation files.

- `lib/mcp/catalog.ts` maps authenticated agent operations to existing admin services; `lib/mcp/auth.ts` owns revocable keys, OAuth/PKCE and mutation deduplication. The request-local `lib/agent-context.ts` is established only after bearer validation. Browser connection management and page guards require the actual admin cookie. Never expose raw SQL or accept an admin identity from tool inputs. See `docs/MCP-SETUP.md` for Hermes and other clients. Schema version9 adds connector tables without replaying earlier data backfills.

- `lib/documents.ts` owns file access, creation/linking, revision-checked snapshots, staged chunks and one-editor leases. CasualOffice SDKs live in the isolated `office-editor/` build; do not add their large bundles to the dashboard. Live collaboration is disabled by owner preference. Schema10 and behavior are documented in `docs/DOCUMENTS.md`.

See `GLOSSARY.md` for business terms and `docs/ARCHITECTURE-REFACTOR.md` for these interfaces and verification.

- Admin: dashboard, students, schedule/classes, recurring-series management, invoices, financial-history, classroom, requests, notifications, settings.
- Student: /portal/student/{id}, own schedule/classroom/notes/notifications/profile. Own-post checks apply independently of the layout.
- Parent: /share/{token} and attendance/schedule/reports/invoices; every route validates active scoped bearer token, not just its layout.
- Meeting: actual admin or owning active student; separate teacher/student notes; exact-room JaaS JWT if configured.

## Business rules

- Attendance states: Present, Absent (late cancellation/no-show), advance Cancelled. No Late write option. Rate Present/(Present+Absent), ignore canceled/unmarked. Legacy Late reads normalize to Present.
- Canceled/absent lessons never appear on invoices. Only present/legacy-attended completed, unclaimed lessons are selected. Rescheduled replacements retain trial classification and bill only once marked Present.
- Invoice descriptions contain date/time/duration, no subject. Money is rounded perline and header=sum(lines). Generation and class claim selection are one write transaction. Canceling invoice preserves financial history.
- Revenue is billed amounts by billing month, Paid+Outstanding, excluding canceled invoice documents. Payment date never reattributes lesson-month revenue.
- All datetime-local input represents Asia/Kuala_Lumpur; normalize through lib/domain/business-time.ts and persist UTC ISO. UI formatting uses lib/format.ts. Never compare ISO timestamps with SQLite space-formatted timestamps as plain strings.
- Recurrence default end is31December of its start year. No holiday feature. Generate room+unmarked attendance; stop only future scheduled lessons and retain rows/history. Prevent overlap across all students for the single tutor.
- submissions is the current projection; submission_versions preserves each attempt with its work, grade, feedback and maximum-points snapshot. Only current version can be graded; expectedVersion prevents stale grading. Numeric scores0..max only.
- Meaningful student-relevant changes create recipient-scoped notifications. Edits notify as well as creation. No-op edits/replayed requests must not duplicate notifications. Inbox counts count all unread, not only the latest displayed messages.
- Student deactivation immediately removes access, while historical records are retained. Parent bearer link revocation is separately managed.
- Browser reminders and holiday management are intentionally removed, not unfinished features.

## Security and performance

Use requireAdminPage for admin reads, ownStudentContext/requireStudentPage for student reads, and requireParent for bearer reads. Validate action target ownership/type/state on the server; hidden controls and foreign keys do not establish authorization. Never select student passwords/private tutor notes into student/parent payloads.

getSettings batches configuration reads. Migrations use the settings.app_schema_version record (Turso rejects PRAGMA user_version writes) and a single in-flight promise, with serialized reviewed writes. Do not reintroduce DDL, seeding or cleanup on every request. withTransaction serializes local writers; validate a complete operation before committing related records/notifications. Do not cache one user's private data globally.

Use explicit pending/error state, confirmed calendar time changes, scoped safe upload URLs and bounded same-origin upload chunks (no total-file application cap). Parent reports and historical submission attempts default collapsed. Mobile menus close on navigation and page controls must fit390px screens.

## Verification / deployment

Node24/npm11. npm test exercises real local SQLite and actual modules with explicit request/UI stubs; browser evidence is separately labeled. Run npm run typecheck and npm run build. Use fake isolated data, never destructive live tests. External JaaS/Google storage and real deployed latency require separate evidence.

Use existing checkout; no worktree unless requested. Source edits approved in this session are local; no push or production deployment is implied. main is connected to Vercel.
