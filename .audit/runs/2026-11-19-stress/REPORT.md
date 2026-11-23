# Stress audit and UI verification — 23 November 2026

This is the current-code regression audit, started 19 November and completed against the 23 November repair batch. Baseline: `2dcf1d7`. Tests used a separate local database and synthetic accounts. Production was not load tested or populated with fake records.

## Results and what they establish

| Check | Result | Evidence |
|---|---|---|
| Automated application suite |132 tests passed,0 failed | `scenario-results.json`; `tests/*.test.cjs` |
| Production compilation and TypeScript checking | Passed | `npm run build` |
| Local HTTP stress run |977 requests passed | `http-load-results.json` |
| Role/viewport browser sweep |96 views,0 overflow failures,0 browser runtime errors after fixes | `ui-matrix-final.json` |
| Controlled failed-save dialogs |5 dialogs retained drafts and showed errors | `dialog-fault-after.json` |
| Full-page edit failure | Fields retained; submit disabled while pending | `edit-form-after.json` |
| Delayed chat history during room switch | No messages from previous room appeared | `chat-history-room-switch-after.json` |
| Repeated comment-history click | One request; no duplicate comments | `comments-history-after.json` |
| Long-name student mobile profile | No horizontal overflow | `ui-focused.json`; `student-long-name-mobile.png` |
| Navigation, search, filters, tabs and pagination | Passed recorded interactions for all three roles | `ui-controls.json` |

The browser sweep visits 31 admin, 10 student and 7 parent routes at 1440px and 390px. It checks rendering, response errors, page overflow and runtime errors. It is **not a claim that every button or every possible business sequence was clicked**. Targeted interactive failures and role-specific business tests are separate evidence. The numbered [user capabilities and manual test guide](../../../docs/USER-CAPABILITIES-AND-TEST-GUIDE.md) remains the page-by-page walkthrough for manual testing.

## Fixes

Every item below was implemented in this batch. “Executed” means a real local test or browser reproduction; controlled storage responses do not establish live Google Drive behavior.

| ID | Problem and resulting behavior | Evidence |
|---|---|---|
|F01|Chat history requests could append one student's messages under another selected room. Abort previous history and check the selected room before committing responses. Poll continuation also rechecks its scope after extra awaited batches.|Executed browser before/after; continuation guard Traced. `components/family-chat.tsx:97,110–126`|
|F02|Diagnostic answer UI briefly claimed Saved while the new answer existed only in memory. It now shows Unsaved changes, then Saving, and Saved after acknowledgement.|Executed browser. `components/diagnostics/questionnaire.tsx:24`|
|F03|Failed full-page profile saves lost entered work and allowed repeat submission. The page now uses the existing pending-aware form and structured quick action.|Executed503 browser fault. `app/students/[id]/edit/page.tsx:42`|
|F04|Long unbroken names overflowed admin/student profile layouts. Constrain flex children and wrap names; preserve larger readable text.|Executed desktop/mobile. `components/page-header.tsx:16`; profile pages|
|F05|Initials split emoji surrogate pairs, producing invalid server text and hydration errors. All affected avatars now use complete Unicode code points.|Executed Unicode transport test and browser sweep. `lib/initials.ts:2`|
|F06|Unchanged edits/replayed cancellation/report saves produced duplicate notifications. No-op guards retain existing records without notifying again.|Executed real SQLite/business actions. `lib/actions.ts:317,456,571,618`|
|F07|Assignments without a points maximum accepted negative/nonnumeric grades. Require finite nonnegative scores for all assignments and align the grading input and guidance.|Executed backend tests; client input Traced. `lib/actions.ts:1422`; `components/classroom/grade-submission.tsx:37`|
|F08|Student schedule still offered another request while a reschedule was pending. Display current pending/declined state and suppress the impossible duplicate action.|Executed SQL/SSR semantics. Student schedule page|
|F09|Calendar and profile queries compared mixed timestamp formats as text, hiding some legacy lessons; extreme calendar URLs could fail. Compare temporal values and constrain supported query years.|Executed calendar SQL/SSR tests; profile legacy timestamp browser regression. `app/schedule/page.tsx:29,45`; `app/students/[id]/page.tsx:112`; `profile-legacy-after.json`|
|F10|Primitive/malformed request bodies or malformed Origin values caused server errors. Return intentional400/403 responses before business changes.|Executed route tests and HTTP calls. Chat/diagnostic/upload/recovery routes|
|F11|Upload completion, offsets, receipts and cancellation were insufficiently validated. Verify exact completion/file identity, retry the same finish ticket within bounded timeouts, validate signed receipt shape and stop pre-aborted reads.|Executed controlled-provider tests. `lib/upload-client.ts`; `lib/upload-authority.ts:59`; upload/files routes|
|F12|SDK row objects retained positional metadata when passed to client UI. Query helpers now return plain named-column records.|Executed real SQLite serialization test. `lib/db.ts:682`|
|F13|Concurrent local requests could encounter SQLite busy failures. Queue standalone writes alongside transactions and configure local-file WAL/busy timeout. Remote Turso does not receive these SQLite configuration writes.|Executed local contention tests and HTTP rerun. `lib/db.ts:23,617,654,704`|
|F14|Student notes/reschedule actions authorized before waiting for a write lock could save after deactivation. Recheck active status inside the write transaction.|Executed deterministic deactivation races. `lib/actions.ts:1722,1791`|
|F15|Caught errors in client form actions reset uncontrolled dialog fields. Use explicit submit handling so failed saves retain work across student, lesson, recurrence, report, invoice and calendar forms.|Executed Add Student before/after and5 dialog failures after; equivalent forms Traced. `dialog-fault-after.json`|
|F16|Double-clicking older classroom comments fetched/appended the same page twice. A synchronous pending guard, disabled loading button and ID deduplication prevent duplicates.|Executed browser: before2 requests/2 duplicate rows; after1 request/0 duplicates. `components/post-comments.tsx:54,75,190`|
|F17|Intermittent admin hydration failures occurred at the keyed page wrapper while hydrating streamed content. Keep that wrapper stable and give streamed page children an explicit Suspense boundary. Subsequent96-view sweep recorded0 runtime errors.|Executed instrumented browser before/after. `components/main-wrapper.tsx:24`; `ui-matrix-instrumented-detail.json`|
|F18|Changing assignment maximum points changed the displayed ratio of an already recorded grade. Gradebook queries now carry the current attempt's saved maximum and display that denominator.|Executed tutor/student browser before/after. `gradebook-snapshot-before.json`; `gradebook-snapshot-after.json`|
|F19|Invoice cancellation copy incorrectly promised irreversible deletion, and list/detail period end labels disagreed for exclusive month boundaries. Copy now explains retained history; period labels agree.|Traced presentation fix. Invoice list/detail pages; stored financial records unchanged.|

## Business stress coverage

The initial fixture contained 250 students, 12,003 lessons, 2,000 posts, 500 invoices, 6,000 chat messages and 1,000 notifications. Targeted reproductions add synthetic accounts, messages and submission records; `dataset.json` describes the initial seed, not immutable final counts.

The HTTP run includes 38 role pages, 7 access checks, 800 reads at concurrency 1/10/50/100, 100 chat sends with 50 unique idempotency keys, 20 competing diagnostic writes and 12 malformed-body requests. Exactly one diagnostic revision won; the other 19 conflicted. Duplicate sends returned the same committed message IDs.

Application tests additionally exercise 100 simultaneous booking attempts, independent-process booking/billing conflicts, manual/monthly invoice races, attendance/trial/reschedule billing effects, submission lineage/stale grading, notification no-ops, 200 duplicate chat sends, deactivation/revocation races, diagnostic locking and 100 competing whiteboard saves. Assertions include rollback and cross-student isolation, not just successful responses.

Measured HTTP latency is from one local Node server with local SQLite. It is not a Vercel capacity limit, a production latency measurement or a promise about internet uploads.

## Source coverage and limits

Full-read inventories and observations: `static-ui-review.md`, its supporting ledgers, `static-domain-review.md`, and `static-test-review.md`. These separate source tracing from actual execution. Generated output, standard unchanged UI primitives, vendored calendar code and binary assets were excluded explicitly. Existing automated calendar/business tests and browser views still exercise their integration.

Live Google Drive permissions/large-file internet transfer, PDF provider latency, real JaaS calls and distributed Vercel capacity were not stressed. Meeting browser views use a controlled video substitute. No claim that a simulated provider proves the earlier live upload error permanently resolved is made. Deployment still needs its existing provider credentials and `CRON_SECRET` for automated invoice jobs; this audit did not activate missing secrets.

The separate architecture review is prepared at `/tmp/architecture-review-20261119-064123.html`. Invoice generation is the recommended deepening candidate, followed by attachment authority and submitted-work retrieval. The [requested architecture skill](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/improve-codebase-architecture/SKILL.md) says “Which of these would you like to explore?” That selection remains pending; this repair batch does not silently perform the larger refactor.

Reproduction scripts and environment requirements are retained in `harness/README.md`. No session token file, database or private question bank is committed.
