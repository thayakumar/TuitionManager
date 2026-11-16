# Performance investigation — TuitionManager, 13 Nov 2026

No application source changed. Investigation covers every SQL call in lib/db.ts and lib/actions.ts, direct DB/auth calls across all route modules (machine-generated AST inventory), main route query plans, and dynamic function execution of selected page functions using real isolated SQLite. User's production slowness is a report, not yet measured production evidence. No production DB or external provider queried in these experiments.

## Main conclusion

The strongest code-level explanation for slow new pages/actions is **database migration work on the first query of every cold Node worker**, compounded by **duplicate concurrent migrations** and **multiple sequential network round trips per render/action**. This is proven in isolated execution. Production magnitude depends on Vercel cold starts, Turso/network RTT and region placement and must be measured. No evidence justifies claiming every production request runs migrations: the in-process boolean skips them after a successful first migration, until a new worker/module instance.

## Method and limitations

`/workspace/scratch/audit-performance.cjs` transpiles actual unmodified db.ts and page TSX into memory; wraps libSQL client calls for counting/timing; SQLite URL points to an isolated `/tmp/tuition-perf-audit-*.db`. Child UI component imports are stubbed, so route async functions execute real queries and data transforms but no browser rendering, child hydration, HTTP, Next cache/router work, or Vercel cold start is measured. Auth helper is mocked to allow the schedule page; its real1 DB lookup is excluded from schedule timing/count and called out. Settings/date-format helpers are actual code. TS transpilation itself precedes each timed page run. Seed contains one student and one invoice; timings are not a scale benchmark.

`audit-performance-results.json` records calls, exact SQL, start/duration and counts. `perf-route-query-inventory.json` records every direct route call + line from TypeScript AST. `perf-query-plans.json` contains executed SQLite EXPLAIN QUERY PLAN on schema matching relevant actual indexes. Synthetic30ms delays are inserted per DB client call before local execution, to demonstrate dependency depth; they are **not measured Turso latency**.

## P1 — High — Every cold worker runs20 migration client calls /63 SQL statements before user data query (Executed)

Evidence: db.ts305–309 stores `_migrated=false` in module memory; queryAll317/queryOne323/execute329 always await ensureMigrated; db.ts14–302 does full schema housekeeping. There is no persisted migration-version short circuit before DDL and no separate deployment migration command. Existing prepared DB does not avoid migration work in a fresh worker.

On already-created schema, migration is20 sequential client invocations:

- PRAGMA foreign_keys1 (16).
- executeMultiple2 (17,139), containing45 schema/default SQL statements in total. Client batch invocation count is not necessarily the protocol's underlying HTTP count; record as client calls.
- CREATE UNIQUE INDEX2 (256–257).
- ALTER TABLE11 (259–278): all fail duplicate-column on existing DB, all errors swallowed.
- migration marker SELECT1 (283).
- credential seed INSERT2 (298–299).
- expired-session DELETE1 (302).

20 sequential invocations =18 execute +2 executeMultiple,63 individual SQL statements. The first actual query makes21 calls/64 statements. Fresh DB has two extra calls for notes migration288/293. Writes/schema checks run on a request path despite no schema changes. Per-request cold-start cost approximates20 client sequential roundtrip latencies plus remote SQL/locking/runtime cost; do not assume a client call always equals one distinct HTTP connection.

Suggested fix: run versioned migrations once under a deployment/setup process or use one DB schema-version query and migrate only when required, not unconditional DDL. Remove credential seeding/session cleanup from read hot path. Preserve trusted schema bootstrap for new local DB. Must coordinate migration deployment before serving code. Security risk: do not bypass schema/constraints for speed.

## P2 — High — Cold parallel queries each start migrations (Executed)

Boolean `_migrated` becomes true only after awaited migrate completes (305–309); no shared in-flight promise/lock. Two calls before that flag flips both enter migrate. Student detail begins Promise.all(student,currency) at app/students/[id]/page.tsx59–63; students list begins two parallel calls40–43; request concurrent layout/page or distinct requests can likewise race.

Measured real SQLite, zero synthetic lag:

| Cold first callers | Migration invocations | Total client calls | Individual SQL statements | Local wall ms |
|---|---:|---:|---:|---:|
|1 helper|1|21|64|3.56|
|2 concurrent helpers|2|42|128|2.58|
|8 concurrent helpers|8|168|512|7.96|

Local time is tiny because no remote network. Parallelism reduces some wall time but multiplies DB work and DDL contention. With one cold student-detail render, two migrations+11 page queries =51 client calls/137 SQL statements. Under explicit artificial30ms/clientcall, this took715.66ms vs93.21ms warm for same page. Not a production benchmark.

Suggested fix: single in-flight migration promise per worker, reset only on failure; still solve P1 for multiworker environments because a JS promise cannot coordinate Vercel instances. DB-level migration ownership/version concurrency protection required when multiple deployments/instances initialize together. A schema-version cache can be perworker but must handle deployment changes.

## P3 — High — Warm route waterfalls and tiny separate queries (Executed counts; Traced network impact)

Many independent requests are needlessly sequential; each getSetting is its own network query (db333–337). `force-dynamic` throughout route modules means fresh reads per request; no loading.tsx exists (only app/error.tsx), so users lack immediate route skeletons while waiting. Dynamic rendering is appropriate for private fresh data and must not be globally disabled to mask delay.

| Page function (layout excluded) | DB calls warm | Sequential DB waves | Local ms | With synthetic30ms/call ms |
|---|---:|---:|---:|---:|
|Dashboard `/`|11|4|17.65|126.11|
|Student detail|11|3|3.98|93.21|
|Invoice detail|8|2|2.60|62.49|
|Classroom student|4|2|0.88|61.68|
|Schedule|2 + real auth1 omitted by stub|1 measured + auth wave|0.60|30.83 measured + authRTT|

- Dashboard app/page.tsx30 currency await;31 business_name await;33–35 activeStudents await;40–117 then8 concurrent reads. First3 can be grouped, or settings fetched together. Stats SQL76–84 contains8 scalar subqueries (not8 roundtrips but repeated scans). Active student list fetched for dialogs every dashboard render.
- Student detail59–63 first2 reads in parallel;65 roster await;70–139 then8 parallel reads. Roster doesn't depend on student data and can join first/second group. Eleven queries include6 scalar subqueries in stats130–135.
- Invoice detail67 header await;71–85 then7 concurrent reads,5 separate settings. Bulk settings reduces5 reads to1; student/item dependency on invoice legitimate.
- Invoices list59 roster first;64–71 invoice+currency next. Roster unrelated, unnecessarily delays main data.
- Parent share layout15 token=>21 student=>27 businessName:3 serial reads. Each nested share page repeats token (e.g. share page17) and often student/currency. If layout+page execute concurrently on cold worker, P2 can amplify. Request-scoped dedup shared getShareContext using React cache can remove identical token/student reads without cross-user global cache leakage.
- Student portal layout18 session settingslookup,23 studentlookup; nested dashboard22 repeats student query then35 parallel3; student schedule/profile/notes/notifications repeats student read. Request-scoped cached verified student context removes duplication while keeping proper server authorization. Do not trust parent layout alone for actions or streamed page checks.
- Meeting page20 class=>35 student=>46 note=>JWT key/sign; authentication additionally uses isAdminRequest/getStudentSession. Some independent reads can share batch after class ownership known.

AST inventory lists33 route modules: dashboard11; student detail11; invoice detail8; settings6; parent invoice9+layout3; parent home6+layout3; parent schedule4+layout3; student pages2–4+layout2; remaining mostly1–4. Auth wrappers each contain an actual DB read despite being counted as one call in AST; inventory directCalls includes wrappers and directqueries, not raw SQL nested inside helper.

Suggested fix: shared request-scoped authorized contexts and settings bulk read; batch independent SQL queries using supported libSQL batch where correct; parallelize truly independent queries after migration is safe; avoid broad shared cache for authenticated data. Add loading skeletons/pending transitions and contextual mutation status; report latency rather than merely making spinner faster.

## P4 — High for bulk operations — Sequential write loops cause linear action latency (Traced)

- generateInvoice actions531–624 / Quick627–720: authlookup1 + classeslookup1 + nextInvoiceNumberlookup1 + headerINSERT1 + N sequential itemINSERT at604–619 /700–715 =>N+4 DB client calls warm (retries extra). A40lesson invoice needs44 calls before subsequent RSC refresh; at assumed100ms call latency that's4.4sec network-wait floor, **illustrative only**, not measured production. It is also nontransactional (known audit correctness defect). Fix transaction with batched item inserts, atomic claiming and monetary invariant validation, preserving current desired billing policy.
- createRecurrence779–813 /Quick815–848: auth1+holidayread1 + perselectedweekday recurrenceINSERT1+recurrenceread1 + N sequential classesINSERT via875 =>2+2D+N calls. D3 weekdays,N24 classes =>32 calls before page refresh. Missing bounds permits unbounded work, already correctness audit. Compute dates once then atomic batched writes with horizon bound and correct timezone/rooms/attendance.
- saveSettings946–956 loops4 sequential upserts after auth; gradeSubmission etc then revalidates layouts, causing fresh reads.
- submitQuizAnswers1090–1118 deletes1, readsquestions1, then N answerINSERT sequential, no batch/transaction; upload route26–38 buffers file+base64 whole body then waits external Apps Script, so file upload network/Google cold start can be independently slow. External service latency unmeasured.
- Browser meeting autosave after2sec debounce components/meeting-room.tsx59 saves server action; note server write/auth and broad revalidation overhead. Parent UI agent measures action durations to separate actual2sec intended wait from server slowness.

Suggested fix: batch writes transactionally, keep clear success/error/pending UX, measure server action and subsequent refresh separately. Do not suppress revalidation or authorization simply for speed.

## P5 — Medium now / growth risk — Index and unbounded-read issues (Executed plans, production scale impact unverified)

Relevant actual indexes db.ts44–45 class(student_id),class(scheduled_at); invoices(student_id)73; notifications(recipient_type,recipient_id,read)252. No composite status/date/order index.

Executed EXPLAIN on equivalent isolated schema:
- dashboard unpaid invoices statusIN/orderissued: SCAN invoices, USE TEMP B-TREE FOR ORDER BY.
- today classes date(scheduled_at)=day: SCAN classes USING INDEX idx_classes_scheduled_at (not range SEARCH); wrapping indexed column in date() prevents direct time range.
- student upcoming bystudent,status,date: SEARCH idx_classes_student only + TEMP B-TREE ORDER BY. Composite(student_id,status,scheduled_at) could filter/sort in one traversal.
- student notifications byrecipient/ordercreated: SEARCH recipient index prefix + TEMP B-TREE ORDER BY; read third index column not filtered, created_at absent. Separate appropriate(recipient_type,recipient_id,created_at DESC) for inbox ordering, preserve unread index if needed.

Queries load all invoices (app/invoices/page.tsx65–68), all students including credential fields (students40–42), all posts/topics/submissions perstudent (classroom21–34), all student notes(student detail88–91), full periods classes in schedule25–30 (bounded4months, good; class-note content included). Render full arrays clientside. Introduce pagination and narrow SELECT columns; measure rows/payload before assuming tutor's current small dataset needs elaborate materialized aggregates.

Add indexes in versioned migration after EXPLAIN/representative distribution; ensure write overhead isn't excessive; no blanket index every column. Use MYT start/end UTC bounds for today and months to fix both semantics+range performance. Financial query grouping can replace scalar repeated scans once actual DB CPU confirms bottleneck.

## Production unknowns / measurements needed before assigning causal share

No current Vercel project settings, region/runtime metrics, live Turso latency or production row counts were accessed. No sensitive values are needed for diagnosis. Collect:

1. Browser navigation HAR/Performance: click-to-first-feedback, RSC/API request TTFB and total, response bytes, hydration/long tasks and JS chunks; compare hard reload and client navigation after idle vs immediate repeat. Network tab should distinguish POST server action from subsequent RSC GET/refresh.
2. Vercel request/runtime logs: route, timestamp, duration,p50/p95, cold-start/init time vs invocation, region, memory, function type and timeouts. Existing logs only; no deploy/test writes to live app for audit.
3. App safe timing spans/counters (future approved instrumentation): db-init, migration invocations, each DB call duration normalized query label (no SQL args or secrets), rows; action write vs rerender duration; requestID. Avoid logging student/personal data.
4. Turso primary/read region and Vercel compute region, HTTP/libSQL request latencies on cold and warm pools; documented hostname mentions aws-ap-northeast-1 but actual deployment routing must be verified. Client/browser in Malaysia does not guarantee Vercel executes nearby. Region colocation is conditional on availability and data policy.
5. Turso database metrics: SQL rows scanned/read, write/DDL lock latency, query errors, size,rowcounts by main tables, current indexes (metadata only). No queries against production performed in audit.
6. Bundle analyzer/Next build route sizes and browser CPU trace for calendar/UI module. These are client costs, separate from server DB waterfall.

## Prioritized reviewable fix plan (NO FIXES APPLIED)

A. First batch: cold migration path/versioning + single-flight safety, measured server-side counters under approved noPII diagnostics; regression checks one cold initialization under concurrent callers, warm zero migration DDL, fresh schema correct uniqueness. Reuse correctness constraint/migration repair rather than separate conflicting refactors.
B. Route roundtrips: bulk getSettings, request-scoped verified student/share context, parallel independent reads; test result values and crossuser isolation unchanged. Start dashboard/student detail/invoice detail as highest measured querycount, plus portal layouts.
C. Action writes: atomic batched invoice+recurrence+quiz operations, bounds and policy fixes together, regression invariant tests plus count ceilings to prevent new perrow requestloops. Browser state stays pending until server success.
D. User feedback: loading.tsx and targeted skeleton/Suspense, immediate pending button state. Measure click feedback while preserving actual completion semantics; don't call UI feedback alone a latency fix.
E. Add evidence-backed compositeindexes, sargable day/month UTC ranges and paging; narrow SELECT payload and include stable sorts.
F. Verify actual deployment/database region placement and colocation only if live metrics show RTT dominates. Coldstart/runtime memory/bundle tuning after migration amplification eliminated. No publication or live configuration change is authorized by this report.

Validation after approved fixes: repeat identical isolated count harness, HTTP+browser fresh worker and warm requests, artificial RTT tests, fake40-class invoice and multiweekday recurrence; test no crossuser cache leak, no duplicate bills, month-end/absence rules and history preserved. Real production read-only observational metrics should confirm improvement before declaring user's production slowness resolved.


## Read-only production public observations —13 November2026

Confirmed URL: https://tuition-manager-dusky.vercel.app/. No production login was attempted. Initial root→login request took2.864s including redirect/proxy, with reported upstream service time1.344s on root redirect; subsequent direct public samples below were much faster. A single slow public sample does not diagnose authenticated database action latency.

|Path|Sample|HTTP|TTFB through session proxy|
|---|---|---|---|
|/portal/admin|1|200|0.356813s|
|/portal/admin|2|200|0.227626s|
|/portal/student|1|200|0.399093s|
|/portal/student|2|200|0.279015s|
|/|1|307|0.189481s|
|/|2|307|0.192747s|

Local authenticated pages (fake SQLite) warmed at roughly 13–78ms TTFB in this run. These measurements include concurrent local test activity and are not a clean production benchmark. Private production page/action/HAR timings remain unmeasured.
