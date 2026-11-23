# Domain and persistence review — 23 November 2026

Scope: every file under `lib/` and `scripts/`, the current diff in those modules, `CLAUDE.md` and `docs/USER-CAPABILITIES-AND-TEST-GUIDE.md`. The list below records source read in this pass. Browser flows and the full-suite/build results are recorded by the primary audit; this review does not claim those checks were executed here.

## Executed finding D-01 — deactivation could lose a race with a queued student save

**Priority:** High. **Status:** Fixed and regression verified. **Evidence:** Executed against the actual actions module and isolated local SQLite; Next request identities/cache/navigation were explicitly stubbed.

Given an authenticated active student, when the tutor deactivation committed between authentication and obtaining the action's write transaction, `saveStudentNotes` still inserted a note and `createRescheduleRequest` still returned success. Those two actions relied on the earlier session check rather than validating active status inside the write transaction. Submission, comment, diagnostic and chat writes already revalidated relevant active/ownership scope during their own transactions.

Reproduction: a deterministic test replaces only the transaction entry wrapper so it first commits `UPDATE students SET active=0 WHERE id=1`, then invokes the real write transaction. Before the note fix, the test failed with “Missing expected rejection”; after only the note fix, the request returned success and the test failed because `result.error` was undefined. This establishes both failures independently without timing-sensitive sleeps or production records.

Fix: `lib/actions.ts:1722` rechecks `activeStudent(tx, sid)` before student note persistence. `lib/actions.ts:1791` applies the same recheck to reschedule requests, including the already validated parent path. Parent bearer-link deactivation remains separate from student deactivation, as specified in CLAUDE.md.

Regression: `tests/stress-business.test.cjs:137` checks both actions, zero inserted note/request records and zero notifications after rejection. `node --test tests/stress-business.test.cjs` passed **8/8**. Before/after output was captured in `/tmp/tuition-queued-student-before.log`, `/tmp/tuition-queued-request-before.log`, `/tmp/tuition-queued-student-after.log` during this run. No real data or external writes were used.

## Traced findings and observations

- **D-02 — documentation contradiction:** `docs/USER-CAPABILITIES-AND-TEST-GUIDE.md`, case2.4.1, retained an old “up to4MB” total attachment statement. Cases5.1.2 and8.2 and the current upload implementation correctly describe bounded per-request chunks and no total app attachment cap; only the legacy multipart fallback has a4MiB limit. Reported to primary for documentation correction. Evidence: **Traced**, not a runtime defect.
- **Write queue review:** `lib/db.ts:654` advances the shared queue after success or failure; `withTransaction` and standalone `execute` use the same queue. Existing production transaction callbacks in reviewed `lib/` files use the passed `tx` for writes and do not call the queued standalone helper recursively. No current nested-write deadlock found. A future callback that awaits global `execute()` would deadlock; callers must continue using `tx.execute`. Evidence: **Traced** across the current callsites, rather than a proof about arbitrary future callbacks.
- **Remote/local configuration:** busy timeout and WAL configuration apply only to explicit `file:` databases; no remote Turso PRAGMA version/config writes were introduced. Schema version8 and settings-table version storage are unchanged. Evidence: **Traced**.
- **Business invariants:** present/legacy-late completed lessons alone enter billing claims; canceled/absent lessons are excluded. Manual and automatic generation hold selection/claims in one write transaction. Automatic zero-total skips and manual free-trial invoice behavior remain distinct. Canceled invoices retain their claims/history. Newer submission attempts clear the projection grade while historical attempts and their grades remain. Parent links remain scoped/revocable independently from student deactivation. Evidence: **Traced** here; separate executed module suites are in the main report.
- **Private diagnostics:** server scoring, frozen question snapshots, revision compare/update and per-request deduplication preserve one-attempt and lock behavior. Browser-facing public question DTOs omit answer keys; locked student reports are intentional results access. The private source bank was not read or copied into this report. Evidence: **Traced**.
- **Storage:** supported material types, chunk position checks, same-ticket finish retries, signed actor/file binding, private file links and provider-response normalization reviewed. External Drive delivery/latency was not executed by this reviewer; source tracing does not establish a live connector's permissions or performance.
- **Deliberate policy:** existing credential storage/defaults were left unchanged under prior explicit user policy. No unsolicited change to issued invoices, parent-link behavior or diagnostic reset policy was made.

## Files read

- `lib/action-errors.ts`
- `lib/actions.ts`
- `lib/attachment-url.ts`
- `lib/auth.ts`
- `lib/chat-outbox.ts`
- `lib/classroom-access.ts`
- `lib/db.ts`
- `lib/diagnostic-bank.ts`
- `lib/diagnostic-scoring.ts`
- `lib/diagnostic-types.ts`
- `lib/diagnostics.ts`
- `lib/domain/business-time.ts`
- `lib/domain/validation.ts`
- `lib/drive-connector-script.ts`
- `lib/export.ts`
- `lib/family-chat-actions.ts`
- `lib/family-chat.ts`
- `lib/finance.ts`
- `lib/format.ts`
- `lib/initials.ts`
- `lib/invoice-generation.ts`
- `lib/jaas.ts`
- `lib/lesson-status.ts`
- `lib/monthly-invoices.ts`
- `lib/parent-upload.ts`
- `lib/portal-context.ts`
- `lib/rich-text.ts`
- `lib/storage-config.ts`
- `lib/storage-response.ts`
- `lib/student-profile-actions.ts`
- `lib/types.ts`
- `lib/upload-authority.ts`
- `lib/upload-client.ts`
- `lib/upload-limits.ts`
- `lib/utils.ts`
- `lib/whiteboards.ts`
- `scripts/migrate.mjs`
- `CLAUDE.md`
- `docs/USER-CAPABILITIES-AND-TEST-GUIDE.md`

Generated/vendor files were outside this file group; no files under the listed source directories were skipped.
