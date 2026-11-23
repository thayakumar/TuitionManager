# Test and configuration review — 23 November 2026

Evidence level: **Traced**. This reviewer read the test files and configuration listed below. The primary audit runner owns actual full-suite, browser and HTTP execution records; this note does not claim another independent run.

## Assessment

The suite exercises actual application modules against temporary local SQLite, with explicit Next navigation/cache/session stubs. It covers attendance-to-invoice effects, trial preservation, reschedule rollback, historical work/grade lineage, notification scope, deactivation, legacy migrations, file access, retries, chat replay/read state, diagnostic revisions/locks and whiteboard revision conflicts. The new stress tests add simultaneous callers and a two-process booking/billing check. No new application defect was established by this test-only review.

## Limits and improvements

1. **SSR is not browser interaction.** `tests/stress-ui-pages.test.cjs:4-6` substitutes controls with simple markup and uses static rendering. `tests/classroom-views.test.cjs:13-190` similarly substitutes UI/database boundaries. These provide executed SQL/markup coverage when run, but cannot establish that dialogs, focus, CSS, mobile sizes, or every button work. Keep the production-build browser matrix and targeted interaction evidence separate from this suite's pass count.
2. **Storage providers are controlled substitutes.** `tests/upload-v2.test.cjs:56-106`, `tests/files-stress.test.cjs:42-78` and `tests/pdf-files.test.cjs:44-68` replace fetch responses. They verify transfer semantics, scope, byte offsets and bounded reads, not actual Google permissions, Vercel timeouts or internet PDF latency. No live-provider capacity claim is supported.
3. **One test name is broader than its assertion.** `tests/files-stress.test.cjs:80` is titled “never calls storage”, but checks HTTP400 without a fetch call counter. Source tracing supports the early rejection; the absence of a call is not independently instrumented in that case. This is a test-quality note, not an observed application failure.
4. **The Turso restriction test models one known rejection.** `tests/security.test.cjs:505-534` rejects `PRAGMA user_version=`, preserving coverage of the reported production failure. It uses a local client and does not fully emulate remote Turso. The local WAL configuration is tested separately (`tests/db-serialization.test.cjs:4`); the remote URL branch should continue to be reviewed before touching database initialization.
5. **Load dimensions are bounded.** `tests/stress-business.test.cjs:124-135` covers local simultaneous operations and two independent processes. `tests/stress-state.test.cjs:113-118` covers up to200 same-key sends and100 revision writers. These are useful invariant tests; their success is not a production concurrency SLA.
6. **Browser regressions should remain runnable.** The newly fixed delayed-history room switch, edit form failure preservation, and diagnostic unsaved label require real asynchronous client lifecycle tests. The root audit's isolated Playwright reproductions are the relevant evidence; the Node suite alone does not establish those three fixes.

## Configuration

`npm test` runs every `tests/*.test.cjs` file using Node's test runner. Type checking is a separate command; production compilation is `npm run build`. The migration script uses Node24 TypeScript support. Vercel invokes the monthly invoice route daily at15:59UTC (23:59MYT); the application is responsible for checking the month-end window and the deployment must provide `CRON_SECRET`. This review did not inspect deployment secrets.

## Exact read inventory

- `tests/business.test.cjs`
- `tests/chat-outbox.test.cjs`
- `tests/classroom-views.test.cjs`
- `tests/dashboard.test.cjs`
- `tests/db-serialization.test.cjs`
- `tests/diagnostics.test.cjs`
- `tests/family-chat.test.cjs`
- `tests/files-stress.test.cjs`
- `tests/finance.test.cjs`
- `tests/fixtures/legacy-db.ts.txt`
- `tests/http-input-stress.test.cjs`
- `tests/monthly-invoices.test.cjs`
- `tests/note-save-queue.test.cjs`
- `tests/parent-time-views.test.cjs`
- `tests/pdf-files.test.cjs`
- `tests/rich-text.test.cjs`
- `tests/security.test.cjs`
- `tests/stress-business.test.cjs`
- `tests/stress-state.test.cjs`
- `tests/stress-ui-pages.test.cjs`
- `tests/student-profile.test.cjs`
- `tests/upload-v2.test.cjs`
- `tests/whiteboards.test.cjs`
- `package.json`
- `next.config.mjs`
- `tsconfig.json`
- `postcss.config.mjs`
- `vercel.json`
- `.gitignore`
- `scripts/migrate.mjs`
