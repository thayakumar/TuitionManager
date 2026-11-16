# TuitionManager current-code audit

Started: 12 November 2026; report finalized: 13 November 2026 (Asia/Kuala_Lumpur). Commit: `d8a74b5b843705a2636716a2244ea49b34c292d4`.

## Executive summary

The application builds, but it has confirmed authorization and billing defects. 37 root findings include 5 Blockers, 4 Critical, 20 High, 7 Medium and 1 Low. The largest immediate risk is private admin data readable using a fabricated cookie; other confirmed issues include private cross-student posts/inboxes, anonymous uploads when configured, duplicate invoice charges and lost trial classification. Overall assessment: **significant risk; prioritize authorization and financial correctness before expanding features**.

No application source, tracked tests, dependencies or lockfile were modified. No commit, push, deployment, production database access or real message/upload was performed. New audit documentation is under `.audit/runs/2026-11-12/`; executable probes, fake database and runtime logs are outside the checkout at `/workspace/scratch/audit-2026-11-12/` and `/workspace/scratch/backend-audit*.cjs`.

## Method and coverage

Full read: **130 implementation/component files**, including the inactive example backup, all UI primitives and calendar implementation. Four specialist passes covered10 backend/middleware/upload files,43 app files,40 custom components,37 calendar/UI files. Documentation/configuration/assets and dependency metadata were separately inspected. All148 tracked entries were classified; the4 original audit records are historical evidence, package-lock is machine-inspected dependency metadata. Generated `.next`, installed dependencies and Git internals were excluded from source-read coverage. Existing user/business decisions in the original audit were preserved; earlier fix approvals do not authorize new edits.

Mode: **Dynamic local app with external connectors stubbed; hybrid evidence for unexecuted traces**. Real production build and real local browser/HTTP sessions used isolated SQLite with fake Alice/Bob and parent-token data. Actual action modules were separately exercised against isolated SQLite with explicit auth/cache/redirect stubs; those tests prove domain write behavior, not full HTTP authorization. SSR/store probes exercise calendar internals; browser drag/DST permutations were not run. Every finding labels Executed or Traced, and its detail identifies which portion was actually executed. Dependency severity is registry advisory metadata, not proven exploitability.

The skill became callable on13November and its main instructions were rechecked. Its three referenced supplementary template/category resources still returned read errors. This audit used the main skill's categories1–30, report requirements and included appendices; unavailable supplementary templates were not claimed read.

### Validation

- Production `npm run build`: **PASS**, with actual local test-database URL. Log: `/workspace/scratch/audit-2026-11-12/build.log`.
- `npx tsc --noEmit`: **PASS**. No automated test script exists; `REGRESSION-TESTS.md` is a manual checklist.
- Authenticated render smoke:18 admin pages,7 student pages,6 parent pages; normal login/token controls exercised. A page render pass does not prove every button or workflow works.
- Negative actual HTTP/browser cases: forged-cookie admin reads, cross-student post read, anonymous inbox read/update, forged reschedule ownership and anonymous upload connector use reproduced. Guarded attendance write correctly rejects forged admin cookie; cross-student dashboard and invalid parent token correctly rejected.
- Module integration: concurrent invoice duplication, repeated approvals, trial flag loss, recurrence defaults, fresh schema constraint, bad-date partial mutation and deactivated session reproduced.
- `npm audit --json`:13 affected packages (1 critical,8 high,3 moderate,1 low); no automatic dependency edits.
- Full behavior evidence: {'Fail': 27, 'Pass': 42, 'Observed': 16, 'Policy-dependent': 5}. `Observed` means a raw module observation, not an automatically judged pass/fail. Counts include targeted checks and route smoke checks, not that many independent end-to-end journeys.

Runtime screenshots/logs/results: `/workspace/scratch/audit-2026-11-12/`. A local fake upload connector returned `example.invalid` URLs; no external storage was touched.

## Implied spec and architecture

Next14 App Router renders server-query pages; client dialogs call exported server actions. `lib/db.ts` owns a singleton libSQL client and runtime migration, with SQLite local fallback configured via URL for this audit. Actors: public visitor; admin with7day server-checked token; student with one settings token and own active URL layout; parent with active bearer share token; external JaaS/free Jitsi and Apps Script connectors. No separate tutor role, payment ledger, tenant/branch model, cron/queue or realtime sync exists.

Students are active/inactive with historical rows preserved. Classes are scheduled/completed/canceled; present/late attendance completes, absent cancels; report save completes unless already canceled; direct class edit can independently set status/attendance. Reschedule creates a linked replacement. Recurrences materialize rows up to end date or56days with no replenishing job, skipping holidays known during generation. Invoices snapshot rate/description/amount at generation from currently unclaimed completed/canceled classes, default draft; any status may be set to any other and invoice deletion is hard deletion. Parent/student views reload live SQL; open screens do not synchronize automatically. Paid timestamp is status-driven, not a payment transaction.

Classroom posts/topics are per-student, schema permits null student posts but UI creation uses student. Assignment first submission is exposed in UI; action upserts later content; grade data persists. Quiz actions/schema exist but no active question authoring/answer UI was found. Teacher/student lesson notes are scoped records with client autosave. Notifications are stored in-app events, without background browser reminders.

Read financial amounts are snapshot rows; student/business identity, currency label, payment instructions and QR are live at print time. Month-end invoicing is the user's operating workflow, not enforced by a period-close lock. Post-issue correction behavior remains an unexercised exception; no adjustment policy was invented.

## Current user decisions and contradictions

1. Absences never charge; canceled classes must be absent from invoices. Current code includes canceled zero-value lines and can charge completed+absent records (F28).
2. Invoices are made at month-end; user states post-invoice correction will not occur. Existing arbitrary status changes and deletes are documented but not assigned an invented correction rule.
3. Stopping recurrence cancels future lessons while preserving history. Current action hard-deletes scheduled rows without a date boundary (F29).
4. Inherited decisions: keep existing plaintext/predictable credential scheme; multi-device admin sessions; latest student submission replaces previous; soft-delete students; retained legacy notes column; do not add permanent tests without further approval. Security findings concern unauthorized access, not an unsolicited reversal of accepted credential choices.

Additional contradictions: private admin middleware presence check versus real schedule session validation; three attendance formulas; local MYT formatting versus UTC parsing; Quick/form side effects; published resubmission policy versus hidden form; browser reminder promise versus no scheduler; historical audit says API public bypass removed while current code includes it.

## Prioritized issue table

|ID|Severity|Evidence|Category|Issue|Effort|Decision|
|---|---|---|---|---|---|---|
|F01|Blocker|Executed|Auth|Forged admin cookie exposes private pages|Small|Mechanical|
|F02|Blocker|Executed|Isolation|Student post ownership is not enforced on reads or submissions|Small|Mechanical|
|F03|Blocker|Executed|Auth|Private notifications can be read and cleared anonymously|Small|Mechanical|
|F04|Blocker|Executed|Auth|Reschedule requests trust anonymous caller-supplied ownership|Small|Mechanical|
|F05|Blocker|Executed|Auth|Configured upload service is anonymously writable|Small|Mechanical|
|F06|Critical|Executed|Concurrency|Concurrent invoice generation bills one lesson twice|Medium|Mechanical|
|F07|Critical|Executed|Money|Rescheduling drops the free-trial classification|Small|Judgment|
|F08|Critical|Executed|Money|Parent outstanding balance includes canceled invoices|Small|Mechanical|
|F28|Critical|Executed|Billing policy|Canceled/absent classes are included in month-end invoices contrary to user rule|Small|Mechanical|
|F09|High|Executed|Time|Local datetime input is interpreted in UTC on the server|Medium|Mechanical|
|F10|High|Executed|Time|Invoice dialog chooses the wrong month boundary dates in KL|Small|Mechanical|
|F11|High|Executed|Lifecycle|Resolved reschedule requests can be approved repeatedly|Medium|Mechanical|
|F12|High|Executed|Atomicity|Failed multi-step mutations can leave partial state|Medium|Mechanical|
|F13|High|Executed|Creation drift|Recurring lessons have no meeting room and are pre-marked present|Small|Mechanical|
|F15|High|Executed|Sessions|Student sessions ignore server expiry and deactivation|Medium|Judgment|
|F16|High|Executed|Migration|Fresh database silently omits username uniqueness|Small|Mechanical|
|F22|High|Executed|UI state|Calendar drag/resize gestures are enabled without persistence callbacks|Small|Judgment|
|F29|High|Executed|Lifecycle|Stopping recurrence hard-deletes scheduled history instead of canceling future lessons|Small|Mechanical|
|F30|High|Executed|Dependencies|Installed framework/dependency tree has published vulnerability advisories|Medium|Mechanical|
|F14|High|Traced|Validation|Malformed recurrence values can cause unbounded server work|Small|Mechanical|
|F17|High|Traced|Metrics|Attendance percentage uses three incompatible formulas|Small|Judgment|
|F18|High|Traced|Time|Dashboard current-month and today queries use inconsistent windows|Small|Mechanical|
|F19|High|Traced|Time|Mixed SQLite/ISO timestamp strings show past lessons as upcoming|Small|Mechanical|
|F20|High|Traced|Metrics|Preview limits are presented as total counts|Small|Mechanical|
|F21|High|Traced|Lifecycle|Resubmission UI contradicts recorded policy and retains prior grade|Medium|Judgment|
|F23|High|Traced|Data loss|Meeting note save race can lose latest text while showing Saved|Medium|Mechanical|
|F24|High|Traced|UI state|Inline-created topics cannot be selected in the open post dialog|Small|Mechanical|
|F25|High|Traced|Video isolation|Configured JaaS room isolation and copied links are inconsistent|Medium|Mechanical|
|F26|High|Traced|Validation|Shared server validation is missing for money, duration, grades and states|Medium|Judgment|
|F32|Medium|Executed|UI integration|Calendar primitives disagree on viewport and trigger contracts|Small|Mechanical|
|F27|Medium|Traced|Side effects|Equivalent action paths produce different notifications/invalidation|Medium|Judgment|
|F31|Medium|Traced|Missing feature|Reminder toggle enables permission but schedules no class reminders|Medium|Judgment|
|F33|Medium|Traced|UI affordance|Invoice status filter controls do not filter|Small|Mechanical|
|F34|Medium|Traced|Validation copy|QR upload size promise disagrees with action limit|Quick fix|Mechanical|
|F35|Medium|Traced|Export|CSV escaping does not neutralize spreadsheet formulas|Small|Mechanical|
|F36|Medium|Traced|Accessibility|Global viewport limits browser zoom|Quick fix|Mechanical|
|F37|Low|Traced|Documentation|Setup/security documentation contradicts current implementation|Small|Mechanical|

## Finding details

### F01 — Blocker — Forged admin cookie exposes private pages

**Evidence:** Executed; confidence Certain. **References:** `middleware.ts:44-51; app/students/[id]/page.tsx:60-64,281-299; app/layout.tsx:33-45`.

Anonymous caller sets admin_session=anything. Five private admin routes returned200; students page contained fake Alice data. Normal no-cookie request redirects; /schedule verifies the token and rejects the forgery.

**Risk if left:** All admin data reads, credentials, teacher notes, invoices remain exposed or inconsistent under the described trigger.

**Proposed change:** Validate real server sessions in a shared admin route layout or every admin read entry; leave public/student/share paths separate. Test missing, forged, expired and student sessions across all admin pages.

**Blast radius:** All admin data reads, credentials, teacher notes, invoices. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B01; routes R1; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F02 — Blocker — Student post ownership is not enforced on reads or submissions

**Evidence:** Executed; confidence Certain. **References:** `app/portal/student/[studentId]/classroom/post/[postId]/page.tsx:35-55; lib/actions.ts:1058-1070,1090-1114`.

Alice logged in normally, requested her own student URL with Bob post id, and read BOB_PRIVATE_MARKER. Real action integration also persisted Alice submissions and quiz answers to Bob posts (auth stubs documented).

**Risk if left:** Student classroom confidentiality, teacher submissions and grading remain exposed or inconsistent under the described trigger.

**Proposed change:** Derive student identity from session; fetch post WHERE id=? AND student_id=? before reading files or writing answers; enforce post type and any explicit shared-post policy.

**Blast radius:** Student classroom confidentiality, teacher submissions and grading. **Effort:** Small. **Type:** Mechanical. Supporting detail: routes R2; backend B02; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F03 — Blocker — Private notifications can be read and cleared anonymously

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:1349-1373`.

Actual unauthenticated HTTP server-action calls retrieved admin and Bob private messages. Anonymous markNotificationRead returned success; isolated DB test confirms clearing all admin unread indicators.

**Risk if left:** Admin/student inboxes, unread counts and sensitive messages remain exposed or inconsistent under the described trigger.

**Proposed change:** Require admin or owning student session; derive recipient from identity, constrain every update by recipient ownership, and bound the limit.

**Blast radius:** Admin/student inboxes, unread counts and sensitive messages. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B01; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F04 — Blocker — Reschedule requests trust anonymous caller-supplied ownership

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:1252-1276,1292-1312`.

Anonymous HTTP request created a request for Bob class with Alice student id. Approval uses actual class owner for replacement but forged request student for notification.

**Risk if left:** Student schedule requests, admin queue, wrong recipient notifications remain exposed or inconsistent under the described trigger.

**Proposed change:** Require active student session, derive student id, verify owned scheduled class, validate preferences before writes, prevent duplicate pending requests.

**Blast radius:** Student schedule requests, admin queue, wrong recipient notifications. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B01; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F05 — Blocker — Configured upload service is anonymously writable

**Evidence:** Executed; confidence Certain. **References:** `middleware.ts:10,19-20; app/api/upload/route.ts:6-56`.

Anonymous multipart HTTP request returned200 and an upload URL using a local fake connector. No real Google upload occurred. Exposure is conditional on production upload configuration.

**Risk if left:** Google Drive storage and upload quotas; public files remain exposed or inconsistent under the described trigger.

**Proposed change:** Authenticate admin or active student before form parsing, derive student scope, validate file/type/size and map connector errors. Secure Apps Script endpoint separately if publicly deployed.

**Blast radius:** Google Drive storage and upload quotas; public files. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B15; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F06 — Critical — Concurrent invoice generation bills one lesson twice

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:531-619,639-714; lib/db.ts:75-84`.

Real actions against isolated SQLite: two simultaneous generations both succeeded and produced two invoice lines for the same RM80 lesson. Invoice-number retry does not reserve lessons.

**Risk if left:** Customer invoices, outstanding balances and revenue remain exposed or inconsistent under the described trigger.

**Proposed change:** Transactionally select/reserve lessons, insert header/items and commit together; enforce unique active lesson billing claim after settling void/rebill semantics. Add parallel generation and partial-failure regressions.

**Blast radius:** Customer invoices, outstanding balances and revenue. **Effort:** Medium. **Type:** Mechanical. Supporting detail: backend B03; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F07 — Critical — Rescheduling drops the free-trial classification

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:479-507,746-768,1292-1305; lib/db.ts:261`.

Real reschedule approval changed is_trial1 to0 on replacement rows. Completing replacement then uses ordinary fee formula (downstream money traced). All three replacement paths omit the flag. Whether a rescheduled trial should remain free needs confirmation because documentation also says rescheduled lessons use normal rates.

**Risk if left:** Trial classes and parent invoice charges remain exposed or inconsistent under the described trigger.

**Proposed change:** Read and copy is_trial through a shared replacement-class constructor; test all three entry points and later invoice line generation.

**Blast radius:** Trial classes and parent invoice charges. **Effort:** Small. **Type:** Judgment. Supporting detail: backend B06; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F08 — Critical — Parent outstanding balance includes canceled invoices

**Evidence:** Executed; confidence Certain. **References:** `app/share/[token]/invoices/page.tsx:26-35; app/invoices/page.tsx:73-75`.

Browser fixture had RM80 sent + RM80 canceled: parent Outstanding displayed RM160; expected RM80 and admin predicate excludes canceled.

**Risk if left:** Parent debt claim versus admin balances remain exposed or inconsistent under the described trigger.

**Proposed change:** Use one shared outstanding predicate/aggregate excluding canceled/paid statuses; add status-transition and parent/admin parity tests.

**Blast radius:** Parent debt claim versus admin balances. **Effort:** Small. **Type:** Mechanical. Supporting detail: routes R3; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F28 — Critical — Canceled/absent classes are included in month-end invoices contrary to user rule

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:556-558,572,650-656,667-669,700-714,332`.

User clarified12Nov: absences free; canceled classes must be omitted entirely. Focused real-module/SQLite test: attended80 + canceled0 line + completed/absent80 produced total160 rather than80. Both generation paths include canceled zero-value rows and price completed+absent normally; refs shared. See /workspace/scratch/policy-results.json.

**Risk if left:** Parent invoices and intended absence treatment remain exposed or inconsistent under the described trigger.

**Proposed change:** Select billable completed non-absent classes only, omit canceled/absent rows in both paths; preserve trial zero-price policy unless changed. Test end-of-month negative/positive inclusion.

**Blast radius:** Parent invoices and intended absence treatment. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B13; user decisions D2026-1; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F09 — High — Local datetime input is interpreted in UTC on the server

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:237,273,305,495,540-541,636-637,762,858-877,1265,1289; lib/format.ts:4-7`.

Actual createClassQuick input10:00 stored10:00Z and renders18:00 MYT. Invoice bounds and recurring dates use same server-local Date pattern (traced).

**Risk if left:** Every calendar, invoice period, dashboard and notification time remain exposed or inconsistent under the described trigger.

**Proposed change:** Introduce explicit Asia/Kuala_Lumpur wall-time/date-bound conversion to UTC. Apply consistently to one-off/update/reschedule/recurrence/invoice actions and default inputs. Test midnight/month-end.

**Blast radius:** Every calendar, invoice period, dashboard and notification time. **Effort:** Medium. **Type:** Mechanical. Supporting detail: backend B07; components C07; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F10 — High — Invoice dialog chooses the wrong month boundary dates in KL

**Evidence:** Executed; confidence Certain. **References:** `components/generate-invoice-dialog.tsx:27-32,111-130`.

Real browser timezone Asia/Kuala_Lumpur displayed October31–November29 as November defaults. Can include October work and omit November30.

**Risk if left:** Month-end invoice lesson inclusion remain exposed or inconsistent under the described trigger.

**Proposed change:** Format local calendar dates without toISOString date truncation; coordinate with F09 server interpretation.

**Blast radius:** Month-end invoice lesson inclusion. **Effort:** Small. **Type:** Mechanical. Supporting detail: components C01; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F11 — High — Resolved reschedule requests can be approved repeatedly

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:1279-1344; lib/actions.ts:479-515`.

Real action test approved request twice and persisted two replacement classes. Rejecting an approved request changes request status without undoing replacement (traced).

**Risk if left:** Duplicate bookings and contradictory student notifications remain exposed or inconsistent under the described trigger.

**Proposed change:** Pending-only conditional transition inside transaction, idempotency key/unique replacement relation, eligibility check and reject or no-op replays.

**Blast radius:** Duplicate bookings and contradictory student notifications. **Effort:** Medium. **Type:** Mechanical. Supporting detail: backend B05; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F12 — High — Failed multi-step mutations can leave partial state

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:746-768,579-619,675-714,1287-1313`.

Actual cancel+reschedule invalid date throws after original is already canceled. Invoice and approval workflows also issue independent writes without rollback (traced).

**Risk if left:** Lost appointments, incomplete invoices, false success histories remain exposed or inconsistent under the described trigger.

**Proposed change:** Validate complete input first; transaction domain writes and stored notifications; commit before invalidation. Fault-inject failures between writes.

**Blast radius:** Lost appointments, incomplete invoices, false success histories. **Effort:** Medium. **Type:** Mechanical. Supporting detail: backend B04; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F13 — High — Recurring lessons have no meeting room and are pre-marked present

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:875-877; app/meeting/[classId]/page.tsx:29`.

Real generated class had attendance=present and meeting_room=null; one-off path creates room and unmarked attendance. Meeting endpoint rejects roomless class.

**Risk if left:** Recurring video lessons, attendance summaries remain exposed or inconsistent under the described trigger.

**Proposed change:** Create every lesson through common defaults: fresh unique room and NULL attendance. Propose separate reviewed remediation for existing generated records.

**Blast radius:** Recurring video lessons, attendance summaries. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B08; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F15 — High — Student sessions ignore server expiry and deactivation

**Evidence:** Executed; confidence Certain. **References:** `lib/auth.ts:84-95; lib/actions.ts:215-217,1228-1233`.

Actual auth module with fake cookies and real SQLite returned student1 after active0; token equality lacks server expiry. Browser layout denies inactive users, but guarded actions can still accept the identity.

**Risk if left:** Former students writing notes/submissions or joining rooms remain exposed or inconsistent under the described trigger.

**Proposed change:** Add expiring server-side student sessions and an explicit deactivation access policy; revoke or restrict tokens on deactivation per Q3.

**Blast radius:** Former students writing notes/submissions or joining rooms. **Effort:** Medium. **Type:** Judgment. Supporting detail: backend B09; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F16 — High — Fresh database silently omits username uniqueness

**Evidence:** Executed; confidence Certain. **References:** `lib/db.ts:256,265,309; lib/actions.ts:90-103`.

On first migration idx_students_username was absent because index creation precedes username ALTER and exception is swallowed. A later migration may repair it; one-process first boot remains unprotected.

**Risk if left:** Login identity uniqueness and startup reliability remain exposed or inconsistent under the described trigger.

**Proposed change:** Add columns before indexes; distinguish already-exists from real failures, coordinate one migration promise and validate constraints. Handle existing duplicate usernames explicitly.

**Blast radius:** Login identity uniqueness and startup reliability. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B10; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F22 — High — Calendar drag/resize gestures are enabled without persistence callbacks

**Evidence:** Executed; confidence Certain. **References:** `components/schedule-calendar-wrapper.tsx:184-188; components/reui/event-calendar/event-calendar.tsx:65-69,524-540,572-602; event-calendar-dnd.tsx:876-920`.

Actual controlled calendar store accepted proposal true but event date remained unchanged; wrapper has no update persistence callback. Browser drag gesture itself was not run.

**Risk if left:** Admin calendar actions versus student/parent persisted schedule remain exposed or inconsistent under the described trigger.

**Proposed change:** Disable unsupported drag/resize/range selection, or implement authorized persistence with rollback and cross-view refresh. Choose desired interaction scope in Q6.

**Blast radius:** Admin calendar actions versus student/parent persisted schedule. **Effort:** Small. **Type:** Judgment. Supporting detail: calendar CAL1; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F29 — High — Stopping recurrence hard-deletes scheduled history instead of canceling future lessons

**Evidence:** Executed; confidence Certain. **References:** `lib/actions.ts:884-890; lib/db.ts:36-44`.

User requires future cancellation with history preserved. Focused real-module/SQLite test confirmed both past and future scheduled rows were deleted; only completed row survived, losing its recurrence link. See /workspace/scratch/policy-results.json.

**Risk if left:** Attendance history, parent schedule, notes and reschedule request cascades remain exposed or inconsistent under the described trigger.

**Proposed change:** Transactionally cancel only future scheduled children, preserve past/all lesson rows and recurrence history or soft-stop flag; decide exact stop boundary in MYT.

**Blast radius:** Attendance history, parent schedule, notes and reschedule request cascades. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend action inventory; user D2026-3; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F30 — High — Installed framework/dependency tree has published vulnerability advisories

**Evidence:** Executed; confidence Certain. **References:** `package.json:18-47; package-lock.json`.

npm audit returned13 vulnerable packages:1 critical,8 high,3 moderate,1 low. Installed Next14.2.33 is flagged including server-action DoS advisories. Registry result is advisory evidence, not proof every exploit is reachable.

**Risk if left:** Public server runtime and build-tool supply chain remain exposed or inconsistent under the described trigger.

**Proposed change:** Review advisory applicability and upgrade to supported patched compatible releases with frozen lockfile rebuild and role/scenario regressions. Do not run npm audit fix blindly; some entries report no automatic fix.

**Blast radius:** Public server runtime and build-tool supply chain. **Effort:** Medium. **Type:** Mechanical. Supporting detail: npm-audit.json; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F14 — High — Malformed recurrence values can cause unbounded server work

**Evidence:** Traced; confidence High. **References:** `lib/actions.ts:799-805,835-840,858-880`.

day_of_week99 can never satisfy getDay comparison; nonpositive custom interval can move backward indefinitely. Intentionally not executed to avoid hanging the machine.

**Risk if left:** Server availability and runaway class creation remain exposed or inconsistent under the described trigger.

**Proposed change:** Validate finite day0..6, positive bounded interval/duration, ordered valid dates and max generation count/horizon before any write.

**Blast radius:** Server availability and runaway class creation. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B11; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F17 — High — Attendance percentage uses three incompatible formulas

**Evidence:** Traced; confidence High. **References:** `app/students/[id]/page.tsx:126-143; app/share/[token]/page.tsx:35-51; app/share/[token]/attendance/page.tsx:29-41`.

Present+late+absent completed fixture computes admin33%, parent67%; adding unmarked completed produces parent dashboard50% versus attendance67%. Cancellation representation also removes absent lessons from completed-only denominators.

**Risk if left:** Admin and parent attendance trust remain exposed or inconsistent under the described trigger.

**Proposed change:** Agree late/absent/canceled/unmarked denominator policy, then centralize formula and disclose pending attendance separately.

**Blast radius:** Admin and parent attendance trust. **Effort:** Small. **Type:** Judgment. Supporting detail: routes R4; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F18 — High — Dashboard current-month and today queries use inconsistent windows

**Evidence:** Traced; confidence High. **References:** `app/page.tsx:28,76-78,94,136-137`.

Classes This Month counts every class after month start, including December in November; agenda compares UTC date(timestamp) to MYT today.

**Risk if left:** Dashboard KPIs and daily agenda remain exposed or inconsistent under the described trigger.

**Proposed change:** Use explicit half-open UTC bounds derived from MYT day/month for counts/hours/cash revenue and agenda. Separate cash chart policy question.

**Blast radius:** Dashboard KPIs and daily agenda. **Effort:** Small. **Type:** Mechanical. Supporting detail: routes R5,R9; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F19 — High — Mixed SQLite/ISO timestamp strings show past lessons as upcoming

**Evidence:** Traced; confidence High. **References:** `app/students/[id]/page.tsx:72; app/share/[token]/page.tsx:29`.

On same UTC date ISO T sorts after SQLite space:01:00 lesson compares greater than now15:00. Other views use ISO bounds and exclude it.

**Risk if left:** Parent and admin upcoming lists remain exposed or inconsistent under the described trigger.

**Proposed change:** Normalize comparisons with consistently encoded UTC bounds or numeric date operations. Test same-day past/future across roles.

**Blast radius:** Parent and admin upcoming lists. **Effort:** Small. **Type:** Mechanical. Supporting detail: routes R6; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F20 — High — Preview limits are presented as total counts

**Evidence:** Traced; confidence High. **References:** `app/share/[token]/page.tsx:29,119; app/students/[id]/page.tsx:72,80,329,442`.

Parent has eight future classes but query LIMIT5 and UI says five upcoming; detail invoice total caps at10.

**Risk if left:** Parent/student counts and per-student history remain exposed or inconsistent under the described trigger.

**Proposed change:** Use separate full COUNT queries and accurate preview labels; provide pagination/full-history route for truncated lists.

**Blast radius:** Parent/student counts and per-student history. **Effort:** Small. **Type:** Mechanical. Supporting detail: routes R7; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F21 — High — Resubmission UI contradicts recorded policy and retains prior grade

**Evidence:** Traced; confidence High. **References:** `app/portal/student/[studentId]/classroom/post/[postId]/page.tsx:125-129; lib/actions.ts:1068-1070`.

Recorded prior Q5 allows latest submission replacing previous; UI removes form after first turn-in. Direct upsert changes content but leaves grade/graded_at, implying new content was graded.

**Risk if left:** Student corrections and teacher grading remain exposed or inconsistent under the described trigger.

**Proposed change:** Provide resubmit form with current content; decide grade reset/version behavior, then enforce consistently in action and display.

**Blast radius:** Student corrections and teacher grading. **Effort:** Medium. **Type:** Judgment. Supporting detail: routes R8; backend B16; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F23 — High — Meeting note save race can lose latest text while showing Saved

**Evidence:** Traced; confidence High. **References:** `components/meeting-room.tsx:45-70,83-98`.

Save A starts; user types B; A finishes and marks all text saved; leave before B debounce skips save and unmount cancels timer. DB keeps A. No delayed-network browser execution yet.

**Risk if left:** Teacher and student private notes remain exposed or inconsistent under the described trigger.

**Proposed change:** Track edited/saved revision or exact text, serialize saves, await latest flush before navigation and warn on unload; test delayed/out-of-order acknowledgments.

**Blast radius:** Teacher and student private notes. **Effort:** Medium. **Type:** Mechanical. Supporting detail: components C02; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F24 — High — Inline-created topics cannot be selected in the open post dialog

**Evidence:** Traced; confidence High. **References:** `components/classroom-post-dialog.tsx:252-278; lib/actions.ts:1123-1134`.

TopicSelector snapshots props once; createTopic refreshes props but localTopics is unchanged and returned id is discarded. Toast succeeds while new option remains absent until remount.

**Risk if left:** Teacher topic organization and assignment grouping remain exposed or inconsistent under the described trigger.

**Proposed change:** Use current props or append/select returned topic immediately; avoid stale copies and preserve entered form data.

**Blast radius:** Teacher topic organization and assignment grouping. **Effort:** Small. **Type:** Mechanical. Supporting detail: components C03; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F25 — High — Configured JaaS room isolation and copied links are inconsistent

**Evidence:** Traced; confidence High. **References:** `lib/jaas.ts:38; components/schedule-calendar-wrapper.tsx:164-168,294; components/jitsi-meeting.tsx:40-43`.

When JaaS configured, tokens authorize room wildcard while app route authorizes one class; calendar copies free meet.jit.si URL rather than app/JaaS room. External video not tested.

**Risk if left:** Private video rooms and joining tutor/student together remain exposed or inconsistent under the described trigger.

**Proposed change:** Bind JWT to authorized room and copy canonical authenticated /meeting/:id app link. Verify configured JaaS with separate student contexts before rollout.

**Blast radius:** Private video rooms and joining tutor/student together. **Effort:** Medium. **Type:** Mechanical. Supporting detail: backend B18; components C05; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F26 — High — Shared server validation is missing for money, duration, grades and states

**Evidence:** Traced; confidence High. **References:** `lib/actions.ts:124,154,179,204,247,283,311-315,325,723-730,1155-1171; components/classroom/grade-submission.tsx:31-39,62-90`.

Negative hourly rates/durations and arbitrary runtime status strings pass Number/TypeScript-only checks. Numeric grade999/100 bypasses native validation because Return is not a form submit.

**Risk if left:** Wrong charges, impossible state labels and misleading grades remain exposed or inconsistent under the described trigger.

**Proposed change:** Use shared runtime schemas for Quick/form variants, finite nonnegative rates, positive durations, enums and grade rules; clarify extra credit/letter grades rather than inventing policy.

**Blast radius:** Wrong charges, impossible state labels and misleading grades. **Effort:** Medium. **Type:** Judgment. Supporting detail: backend B12; components C08; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F32 — Medium — Calendar primitives disagree on viewport and trigger contracts

**Evidence:** Executed; confidence Certain. **References:** `components/ui/scroll-area.tsx:17; components/reui/event-calendar/event-calendar-time-grid.tsx:147-149; event-calendar-dnd.tsx:172,769-772; event-calendar-nav.tsx:311-325`.

SSR proves expected scroll viewport slot absent and unsupported render prop leaks to DOM. Time scrolling cannot find viewport (traced). Month button renders and browser menu opens; not a broken navigation claim.

**Risk if left:** Week/day calendar usability and accessibility remain exposed or inconsistent under the described trigger.

**Proposed change:** Align stable viewport attributes/selectors; use actual Radix asChild trigger composition. Recheck scroll-to-hour, drag auto-scroll, overflow height, tooltip and menu.

**Blast radius:** Week/day calendar usability and accessibility. **Effort:** Small. **Type:** Mechanical. Supporting detail: calendar CAL2,CAL3; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F27 — Medium — Equivalent action paths produce different notifications/invalidation

**Evidence:** Traced; confidence High. **References:** `lib/actions.ts:255,291,368-391,429,473,479-515,746-776,875-877,1166-1168`.

Quick cancel notifies, form cancel does not; direct reschedule/recurrence omit class notifications; report variants invalidate different surfaces. Already-open role pages have no realtime updates.

**Risk if left:** Student inboxes, parent reports and stale open pages remain exposed or inconsistent under the described trigger.

**Proposed change:** Centralize domain events/invalidation after commit; agree which events notify. Test immediate unchanged view versus refetch rather than claiming realtime that is not promised.

**Blast radius:** Student inboxes, parent reports and stale open pages. **Effort:** Medium. **Type:** Judgment. Supporting detail: backend B14; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F31 — Medium — Reminder toggle enables permission but schedules no class reminders

**Evidence:** Traced; confidence High. **References:** `components/notification-toggle.tsx:17-25,33-39`.

Only immediate confirmation Notification exists. There is no reminder scheduler, push subscription or service worker; UI promises notifications before upcoming classes.

**Risk if left:** Tutor expectation of class reminders remain exposed or inconsistent under the described trigger.

**Proposed change:** Either remove reminder promise and accurately label permission, or define delivery/lead-time/tab-closed requirements and implement them.

**Blast radius:** Tutor expectation of class reminders. **Effort:** Medium. **Type:** Judgment. Supporting detail: components C06; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F33 — Medium — Invoice status filter controls do not filter

**Evidence:** Traced; confidence High. **References:** `app/invoices/page.tsx:162-188,231`.

Status badges have hover/cursor styling but no click handler, link or query filter; table always renders all invoices.

**Risk if left:** Admin invoice navigation remain exposed or inconsistent under the described trigger.

**Proposed change:** Implement URL status filtering or remove interaction affordance and label as status counts.

**Blast radius:** Admin invoice navigation. **Effort:** Small. **Type:** Mechanical. Supporting detail: routes R10; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F34 — Medium — QR upload size promise disagrees with action limit

**Evidence:** Traced; confidence High. **References:** `app/settings/page.tsx:180; lib/actions.ts:963`.

UI says2MB; server rejects above512000bytes. A700KB image meets UI promise and fails save.

**Risk if left:** Tutor settings upload errors remain exposed or inconsistent under the described trigger.

**Proposed change:** Align displayed limit with existing500KB limit or explicitly approve increasing validated size.

**Blast radius:** Tutor settings upload errors. **Effort:** Quick fix. **Type:** Mechanical. Supporting detail: routes R11; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F35 — Medium — CSV escaping does not neutralize spreadsheet formulas

**Evidence:** Traced; confidence High. **References:** `lib/export.ts:7-11`.

Values beginning =,+,-,@ can be interpreted as formulas by spreadsheet software; quoting delimiters does not neutralize formulas. Inputs are largely admin-entered, so risk depends on trusted-data assumptions.

**Risk if left:** Downloaded roster/classes/invoice spreadsheets remain exposed or inconsistent under the described trigger.

**Proposed change:** Offer safe spreadsheet encoding for untrusted cell prefixes; preserve legitimate phone/string intent and test Excel-compatible export.

**Blast radius:** Downloaded roster/classes/invoice spreadsheets. **Effort:** Small. **Type:** Mechanical. Supporting detail: backend B17; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F36 — Medium — Global viewport limits browser zoom

**Evidence:** Traced; confidence High. **References:** `app/layout.tsx:28`.

maximumScale1 restricts zoom in browsers that honor it. Actual assistive-device behavior was not tested.

**Risk if left:** Low-vision/mobile users remain exposed or inconsistent under the described trigger.

**Proposed change:** Remove maximumScale restriction and verify responsive layouts plus zoom.

**Blast radius:** Low-vision/mobile users. **Effort:** Quick fix. **Type:** Mechanical. Supporting detail: routes R12; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

### F37 — Low — Setup/security documentation contradicts current implementation

**Evidence:** Traced; confidence High. **References:** `README.md:1-35; CLAUDE.md:19-31,127-138; next.config.mjs:4`.

README describes no accounts/local better-sqlite3 although current code requires libSQL URL and login; security docs describe old session store and middleware guarantees. Historical audit marks /api removed but current middleware includes it.

**Risk if left:** Future changes based on incorrect assumptions remain exposed or inconsistent under the described trigger.

**Proposed change:** Update verified setup, auth architecture and known limitations after approved code fixes; retain historical audit as history.

**Blast radius:** Future changes based on incorrect assumptions. **Effort:** Small. **Type:** Mechanical. Supporting detail: docs; historical .audit; see corresponding module notes. Dependencies: authorization fixes precede access regressions; F09/F10/F18/F19 share time helpers; F06/F12/F28 share invoice selection/transaction; F11/F07/F29 share class lifecycle handling.

## Inventory, ripple maps and scenarios

- [Complete screen/action/role inventory](inventory.md)
- [Ripple and cross-user matrix](ripple-map.md)
- [Scenarios, invariants and execution limits](scenarios.md)
- [Machine-readable observed results](scenario-results.json)
- [All finding metadata](findings.json)
- [Remaining business questions](questions.md)
- [Concrete proposed fix batches](fix-plan.md)
- [Backend notes and action catalog](backend-notes.md), [route catalog](routes-notes.md), [custom component inventory](components-notes.md), [calendar/UI notes](calendar-notes.md)

## Not verified / limits

No production Vercel runtime or real Turso data was queried. No live JaaS meeting, Google Drive connector, SMS, email, WhatsApp send, payment, or external identity changes. JaaS findings are conditional traces; upload test used a fake connector. Browser gesture, delayed meeting autosave interleaving, complete responsive/accessibility/device matrix, every concurrent edit permutation, exhaustive recurrence/DST semantics and partial-failure injection for every action remain unrun. Screens without dedicated loading boundaries and uncaught action errors were inspected, but no claim that every UI failure state was dynamically exercised. Shared/null-post behavior, late attendance denominator, archival access, regrading, extra credit and event notification rules require decisions. No source fixes or permanent regression tests are authorized yet.

The original completed audit is preserved. This run's progress ledger and notes make unfinished checks explicit; they are not marked fully executed merely because all source was read.
