# Proposed repair plan — NOT APPROVED

No code modifications have been authorized. User policy replies define expected behavior; they are not fix approval. Source line references and proposed pseudocode changes below are concrete review scope. Existing decisions remain unless user revises them. Permanent regression tests were previously declined; scratch probes can be rerun. Adding permanent tests requires explicit new approval.


## Batch 1: Blockers and Critical

- **F01** — `middleware.ts:44-51; app/students/[id]/page.tsx:60-64,281-299; app/layout.tsx:33-45`: Validate real server sessions in a shared admin route layout or every admin read entry; leave public/student/share paths separate. Test missing, forged, expired and student sessions across all admin pages.
- **F02** — `app/portal/student/[studentId]/classroom/post/[postId]/page.tsx:35-55; lib/actions.ts:1058-1070,1090-1114`: Derive student identity from session; fetch post WHERE id=? AND student_id=? before reading files or writing answers; enforce post type and any explicit shared-post policy.
- **F03** — `lib/actions.ts:1349-1373`: Require admin or owning student session; derive recipient from identity, constrain every update by recipient ownership, and bound the limit.
- **F04** — `lib/actions.ts:1252-1276,1292-1312`: Require active student session, derive student id, verify owned scheduled class, validate preferences before writes, prevent duplicate pending requests.
- **F05** — `middleware.ts:10,19-20; app/api/upload/route.ts:6-56`: Authenticate admin or active student before form parsing, derive student scope, validate file/type/size and map connector errors. Secure Apps Script endpoint separately if publicly deployed.
- **F06** — `lib/actions.ts:531-619,639-714; lib/db.ts:75-84`: Transactionally select/reserve lessons, insert header/items and commit together; enforce unique active lesson billing claim after settling void/rebill semantics. Add parallel generation and partial-failure regressions.
- **F07** — `lib/actions.ts:479-507,746-768,1292-1305; lib/db.ts:261`: Read and copy is_trial through a shared replacement-class constructor; test all three entry points and later invoice line generation.
- **F08** — `app/share/[token]/invoices/page.tsx:26-35; app/invoices/page.tsx:73-75`: Use one shared outstanding predicate/aggregate excluding canceled/paid statuses; add status-transition and parent/admin parity tests.
- **F28** — `lib/actions.ts:556-558,572,650-656,667-669,700-714,332`: Select billable completed non-absent classes only, omit canceled/absent rows in both paths; preserve trial zero-price policy unless changed. Test end-of-month negative/positive inclusion.

## Batch 2: High

- **F09** — `lib/actions.ts:237,273,305,495,540-541,636-637,762,858-877,1265,1289; lib/format.ts:4-7`: Introduce explicit Asia/Kuala_Lumpur wall-time/date-bound conversion to UTC. Apply consistently to one-off/update/reschedule/recurrence/invoice actions and default inputs. Test midnight/month-end.
- **F10** — `components/generate-invoice-dialog.tsx:27-32,111-130`: Format local calendar dates without toISOString date truncation; coordinate with F09 server interpretation.
- **F11** — `lib/actions.ts:1279-1344; lib/actions.ts:479-515`: Pending-only conditional transition inside transaction, idempotency key/unique replacement relation, eligibility check and reject or no-op replays.
- **F12** — `lib/actions.ts:746-768,579-619,675-714,1287-1313`: Validate complete input first; transaction domain writes and stored notifications; commit before invalidation. Fault-inject failures between writes.
- **F13** — `lib/actions.ts:875-877; app/meeting/[classId]/page.tsx:29`: Create every lesson through common defaults: fresh unique room and NULL attendance. Propose separate reviewed remediation for existing generated records.
- **F15** — `lib/auth.ts:84-95; lib/actions.ts:215-217,1228-1233`: Add expiring server-side student sessions and an explicit deactivation access policy; revoke or restrict tokens on deactivation per Q3.
- **F16** — `lib/db.ts:256,265,309; lib/actions.ts:90-103`: Add columns before indexes; distinguish already-exists from real failures, coordinate one migration promise and validate constraints. Handle existing duplicate usernames explicitly.
- **F22** — `components/schedule-calendar-wrapper.tsx:184-188; components/reui/event-calendar/event-calendar.tsx:65-69,524-540,572-602; event-calendar-dnd.tsx:876-920`: Disable unsupported drag/resize/range selection, or implement authorized persistence with rollback and cross-view refresh. Choose desired interaction scope in Q6.
- **F29** — `lib/actions.ts:884-890; lib/db.ts:36-44`: Transactionally cancel only future scheduled children, preserve past/all lesson rows and recurrence history or soft-stop flag; decide exact stop boundary in MYT.
- **F30** — `package.json:18-47; package-lock.json`: Review advisory applicability and upgrade to supported patched compatible releases with frozen lockfile rebuild and role/scenario regressions. Do not run npm audit fix blindly; some entries report no automatic fix.
- **F14** — `lib/actions.ts:799-805,835-840,858-880`: Validate finite day0..6, positive bounded interval/duration, ordered valid dates and max generation count/horizon before any write.
- **F17** — `app/students/[id]/page.tsx:126-143; app/share/[token]/page.tsx:35-51; app/share/[token]/attendance/page.tsx:29-41`: Agree late/absent/canceled/unmarked denominator policy, then centralize formula and disclose pending attendance separately.
- **F18** — `app/page.tsx:28,76-78,94,136-137`: Use explicit half-open UTC bounds derived from MYT day/month for counts/hours/cash revenue and agenda. Separate cash chart policy question.
- **F19** — `app/students/[id]/page.tsx:72; app/share/[token]/page.tsx:29`: Normalize comparisons with consistently encoded UTC bounds or numeric date operations. Test same-day past/future across roles.
- **F20** — `app/share/[token]/page.tsx:29,119; app/students/[id]/page.tsx:72,80,329,442`: Use separate full COUNT queries and accurate preview labels; provide pagination/full-history route for truncated lists.
- **F21** — `app/portal/student/[studentId]/classroom/post/[postId]/page.tsx:125-129; lib/actions.ts:1068-1070`: Provide resubmit form with current content; decide grade reset/version behavior, then enforce consistently in action and display.
- **F23** — `components/meeting-room.tsx:45-70,83-98`: Track edited/saved revision or exact text, serialize saves, await latest flush before navigation and warn on unload; test delayed/out-of-order acknowledgments.
- **F24** — `components/classroom-post-dialog.tsx:252-278; lib/actions.ts:1123-1134`: Use current props or append/select returned topic immediately; avoid stale copies and preserve entered form data.
- **F25** — `lib/jaas.ts:38; components/schedule-calendar-wrapper.tsx:164-168,294; components/jitsi-meeting.tsx:40-43`: Bind JWT to authorized room and copy canonical authenticated /meeting/:id app link. Verify configured JaaS with separate student contexts before rollout.
- **F26** — `lib/actions.ts:124,154,179,204,247,283,311-315,325,723-730,1155-1171; components/classroom/grade-submission.tsx:31-39,62-90`: Use shared runtime schemas for Quick/form variants, finite nonnegative rates, positive durations, enums and grade rules; clarify extra credit/letter grades rather than inventing policy.

## Batch 3: Medium/Low

- **F32** — `components/ui/scroll-area.tsx:17; components/reui/event-calendar/event-calendar-time-grid.tsx:147-149; event-calendar-dnd.tsx:172,769-772; event-calendar-nav.tsx:311-325`: Align stable viewport attributes/selectors; use actual Radix asChild trigger composition. Recheck scroll-to-hour, drag auto-scroll, overflow height, tooltip and menu.
- **F27** — `lib/actions.ts:255,291,368-391,429,473,479-515,746-776,875-877,1166-1168`: Centralize domain events/invalidation after commit; agree which events notify. Test immediate unchanged view versus refetch rather than claiming realtime that is not promised.
- **F31** — `components/notification-toggle.tsx:17-25,33-39`: Either remove reminder promise and accurately label permission, or define delivery/lead-time/tab-closed requirements and implement them.
- **F33** — `app/invoices/page.tsx:162-188,231`: Implement URL status filtering or remove interaction affordance and label as status counts.
- **F34** — `app/settings/page.tsx:180; lib/actions.ts:963`: Align displayed limit with existing500KB limit or explicitly approve increasing validated size.
- **F35** — `lib/export.ts:7-11`: Offer safe spreadsheet encoding for untrusted cell prefixes; preserve legitimate phone/string intent and test Excel-compatible export.
- **F36** — `app/layout.tsx:28`: Remove maximumScale restriction and verify responsive layouts plus zoom.
- **F37** — `README.md:1-35; CLAUDE.md:19-31,127-138; next.config.mjs:4`: Update verified setup, auth architecture and known limitations after approved code fixes; retain historical audit as history.

## Regression probes proposed for approval

Reuse scratch probes for forged-cookie reads, inbox read/write, cross-student read/submission, connector upload authorization, double invoice generation, repeated approval, trial-preserving reschedule, date boundaries, recurrence defaults/stop history, migration constraints and autosave ordering. Add permanent regression files only if the user explicitly overrides the earlier decision to skip them. Proposed new files would be scoped domain/API tests, not tests mirroring code.

## Gate

After answering applicable questions, approve all, Batch1 only, or named finding IDs. A fix to shared session/date/invoice logic will be centralized and adjacent role/ripple checks rerun. Changes will remain local until separately authorized for commit/push/deployment.
