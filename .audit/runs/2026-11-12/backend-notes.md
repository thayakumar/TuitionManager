# Backend audit — 2026-11-12

All assigned files read fully, no source edited: lib/actions.ts (1–1374), lib/auth.ts (1–114), lib/db.ts (1–339), lib/export.ts (1–65), lib/format.ts (1–36), lib/jaas.ts (1–67), lib/types.ts (1–240), lib/utils.ts (1), middleware.ts (1–58), app/api/upload/route.ts (1–56). Read prior decisions.json; accepted plaintext passwords, predictable student credentials, vestigial meeting_notes and soft student deletion are retained decisions, not new fix authorization. No additional actor/tenant exists in backend.

## Execution method / evidence

/workspace/scratch/backend-audit-test.cjs and backend-audit-extra.cjs transpile the ACTUAL unmodified TypeScript into memory, invoke real exported actions with real libSQL SQLite databases created under /tmp/tuition-backend-*.db, and inspect persisted DB state. Cache/redirect are stubbed; auth helpers are stubbed by role for action-level scenarios (anonymous=false/null, student=1, admin=true). These are **Executed module integration tests, not end-to-end HTTP authorization tests**. The extra test loads actual auth.ts with mocked cookies, actual DB, to validate deactivated sessions. Results: audit-backend-results.json and audit-backend-extra-results.json. No production secrets, data or remote side effects used. Statements about UI reachability remain Traced unless parent upgrades them.

## Findings ranked

### B01 — Blocker — Missing guards on new reschedule + notification server actions (Certain; Executed module + Traced HTTP exposure)
- actions.ts:1252–1276 createRescheduleRequest has no session check and trusts both class_id and student_id; foreign keys do not require class ownership. Anonymous form class_id=1(Bob),student_id=1(Alice) succeeds, persists mismatch and admin notification. approveRescheduleRequest:1292–1312 then reschedules Bob's class but notifies Alice (the forged request ID).
- actions.ts:1349–1361 getNotifications accepts arbitrary recipientType/recipientId with no session check. Anonymous fetched admin inbox; actions.ts:1364–1373 allow unauthenticated mark arbitrary/read-all inbox, executed setting admin read=1.
- Consequences: students/anonymous can submit other people's schedule changes for admin approval, read other students' notifications (including private assignment title/admin rejection notes), erase unread indicators.
- Fix: require student identity from session; classBelongsToStudent and scheduled-only eligibility; derive request.student_id. Require admin or own student session on notification calls, derive DB recipient scope; bound positive limit. Mechanical. Same guard root cause, two action domains may be split into two fixes.

### B02 — Blocker — Student can submit to another student's post/quiz (Certain; Executed)
- actions.ts:1058–1070 requireStudentSession checks supplied student_id only; no SELECT posts owner/type. Alice1 submits to Bob2's assignment post1; DB joins post_owner=2,submitter=1.
- actions.ts:1090–1114 identical missing post owner/type; Alice answers Bob's quiz2 and receives stored correct=1. FK enforces existence, not assignment.
- Fix authorize post where student_id=current or deliberate shared null policy, correct type and eligibility before writing. Derive student_id. Schema composite constraints may help. Mechanical for private student posts; global/null-post policy needs question. Ripple: teacher grades/counts now include other users; owner's page submission lists unauthorized author.

### B03 — Critical — Concurrent invoices double-bill same lesson (Certain; Executed)
- actions.ts:639–657 reads unbilled classes before any lock/transaction; 672–696 retries only invoice_number; 700–714 inserts line items with no UNIQUE(class_id) (db.ts75–84). generateInvoice531–619 duplicates same algorithm.
- Two simultaneous generateInvoiceQuick for Alice's one 60min completed RM80 lesson both fulfilled invoices1 and2; invoice_items class5 bills=2. RM160 billed for one lesson. Unique number retry makes each header unique, does not solve same lesson inclusion.
- Fix transaction covers selection/header/items; enforce unique billable class claim (consider canceled/void rebilling policy), rollback all on error. Mechanical and important outstanding prior A-13.

### B04 — High — Nonatomic multiwrite workflows leave contradictory records on failure (Certain; Executed cancellation, Traced others)
- cancelClass746–768 updates canceled first at756–759; only then parses reschedule date762. Bad date throws, original already canceled, no replacement. Executed.
- invoice header inserted579/675 before items614/710; later failures leave total without full items and lessons claimable again. createRescheduleRequest insert1262 before notification1268; approval request marked approved1287 before cancel1297, replacement1302 and notification1309. No rollback.
- Fix validate all input first and use transactional grouped writes, notifications commit with domain records; revalidate only after commit. Mechanical.

### B05 — High — Re-approving resolved request creates duplicate classes, rejection after approval lies about schedule (Certain; Executed duplicates)
- approve1279–1320 SELECT no status and unconditional update; approval twice generated2 distinct replacements for original class1. reject1323–1344 also no status guard, so approved=>rejected while replacement remains and student receives declined message.
- createRescheduleRequest also no duplicate-pending check, scheduled eligibility or time validity (1252–1266). rescheduleClassQuick479–515 allows any status and unlimited replacements.
- Fix pending-only compare/update inside same transaction, reject replay/idempotent success, one active replacement per original, validate source class state. Mechanical state integrity; allowed reschedule lead time/past/grades policy needs question.

### B06 — Critical — Rescheduling a trial silently turns free trial into paid lesson (Certain; Executed flag loss, Traced money)
- rescheduleClassQuick498, cancelClass765, approveRescheduleRequest1303 replacement INSERT omit is_trial; schema default0 at db261; source SELECT484/750/1292 does not select it. Original Bob class is_trial1 replaced twice each is_trial0. Mark replacement completed => generateInvoice667–669 bills RM80 whereas original trial cost0.
- Fix copy original trial classification (and intentional relevant recurrence metadata) in every replacement path. Mechanical.

### B07 — High — Server-local parsing shifts Malaysian local schedules and invoice boundaries (Certain; Executed schedule)
- createClass237, createClassQuick273, updateClass305, rescheduleClassQuick495, cancelClass762, approve1289/1305 and createRescheduleRequest1265 interpret datetime-local strings via new Date on server; backend is UTC, UI domain TZ explicitly KL lib/format4–7.
- Executed input2026-11-20T10:00 stored2026-11-20T10:00Z => formatter shows18:00 MYT (user asked10:00). Recurrences858–877 use local getDay,setHours similarly. invoice540–541/636–637 uses UTC date boundaries, omits first8h MYT of requested first day and includes next-day early8h. Description dates611–612/707–708 omit timeZone and disagree with invoice detail date formatter.
- Fix explicit Asia/Kuala_Lumpur interpretation/UTC storage for naive input and period boundaries; explicit timezone for descriptions. Shared conversion root helper. Mechanical under existing domain TZ; confirm if users outside MYT supported.

### B08 — High — Recurrence-generated classes lack meeting rooms and are marked present before attendance (Certain; Executed)
- actions.ts875–877 INSERT attendance='present', meeting_room omitted; one-off classes242–243 attendanceNULL + generated meeting room. Actual generated row present/null. app/meeting/[classId]/page.tsx29 notFound if no room; student schedule154 hides Join button. All recurring video classes impossible to join until code/data correction; future attendance inflates metrics.
- Fix generate room and NULL attendance on same creation helper; existing rows remediation separately approved. Mechanical. Connect with parent/admin attendance denominator definitions in route audit.

### B09 — High — Soft-deactivated student keeps active session and mutations (Certain; Executed actual auth)
- deleteStudent215–217 active0 only; loginStudent73 checks active but getStudentSession84–95 only settings token equality, no student.active, server expiry, deletion state. Actual auth with old token and active0 returns1. saveStudentNotes1228 and submission guards accept returned identity. Student session expiration is browser maxAge only; captured token may be replayed indefinitely until another login/logout overwrites.
- Fix server-side student_sessions with expiry+active check or token issued/expiry data; revoke on deactivation if it means access disabled. Active=false retained historical-data decision does not settle visibility: ask whether archived students should retain historical portal access; separate deny-write policy. Existing multi-device admin decision does not require student multi-device but can ask optional.

### B10 — High — First boot silently omits username uniqueness and migration hides any failure (Certain; Executed missing index)
- db.ts256 tries unique username index BEFORE username ALTER265. Brand-new DB first ensureMigrated => index absent, swallowed unknown-column error; ensureMigrated marks migrated309 so until cold boot/migrate again all username inserts unprotected. Existing duplicates also make CREATE index fail and silently stay unresolved. generateCredentials90–103 uses select-then-insert race.
- Fix ALTER before index, ignore only known duplicate-column error, migration version/lock and promise guard; resolve existing duplicates explicitly before constraint. Mechanical but existing duplicates remediation needs decision. DB constraints unavailable error surfaces otherwise hidden.

### B11 — High — Invalid recurrence fields can make server loop forever (Certain; Traced, intentionally not executed)
- createRecurrence799–805/Quick835–840 casts arbitrary dayOfWeek without range. generator863 loops while cursor.getDay()!=rec.day_of_week; day99 can never match. customInterval negative => step867 negative and cursor<=end869 remains true while date decreases, inserts indefinitely. No cap start/end horizon; huge end_date makes huge work.
- Fix finite integer day0–6, duration>0 bounded, interval1..bound, valid ordered dates, max generation horizon/count; avoid unsafe server loops. Mechanical.

### B12 — Medium — Missing validation permits invalid/negative money, duration, statuses and grades (Certain; Traced)
- student hourly_rate124/154/179/204 any Number accepted (negative, NaN), update blank name allowed172/197 unlike create109. class duration247/283/311 no bound; statuses314–315 and markAttendance325 are TS only, no runtime enums or schema CHECK (db40–41). setInvoiceStatus723–730 arbitrary status. grades1078/1163 arbitrary string vs numeric UI; no max_points validation. These can produce negative charges or impossible state/labels. Need server schema validation shared across duplicate Quick/nonQuick paths and DB CHECK where appropriate. Grade scales may need policy (numeric only? strings e.g. A?). Do not infer all grade strings invalid because schema intentionally TEXT.

### B13 — Medium — Financial lifecycle ambiguities (Judgment; Traced)
- canceled lessons included as zero line items556–558/572; trial zero; absent maps canceled332, so as implemented absent not billed. If attendance corrected after invoicing, existing invoice snapshot never changes because NOT EXISTS558; canceled invoice still claims class because query doesn't join invoice status; deleting any invoice (including paid)739 frees lesson for rebilling and removes history. setInvoiceStatus723 permits all transitions, repeated paid updates paid_at to new timestamp. Cancellation after sent/paid lesson leaves billed money frozen. These require business policy rather than assuming canceled never billed across history. Ask Qs below.

### B14 — Medium — Different action paths omit notifications/revalidation (Certain; Traced)
- createClass and Quick notify student255/291; recurring generator no notif; cancelClassQuick382 notifies, cancelClass746 no notif; direct reschedule479 no notif, approved requests1309 notify. markAttendance absent cancels332 without cancellation notification; updateClass308 no event. saveReport429 share layout invalidation, Quick473 no share layout invalidation. Topics1131/1140/1148, attachments1186/1193 and gradeSubmissionAction1166–1168 do not invalidate per-post detail paths consistently, though server dynamic pages may refresh on navigation; do not claim actual stale browser result without execution. No shared side-effect layer. Fix shared domain events/invalidation; notification event rules need desired policy.

### B15 — High — Upload endpoint has no authentication (Certain; Traced)
- middleware10 /api/ public, contradicts prior decision Q9 and fix-log A29. routePOST6–56 no auth. If APPS_SCRIPT_UPLOAD_URL configured, anonymous may upload arbitrary10MB content to Google Drive; studentName caller controlled; file type not checked. Mis-typed form file string invokes file.arrayBuffer26 ->500, network/JSON errors unhandled. Mechanical: verify admin or active student, server derive folder/student scope, supported MIME/extension; size limit and request platform body limits should align. Root auth gap should group with B01 as appropriate.

### B16 — Medium — Assignment resubmission retains stale grade/feedback (Certain; Traced; policy-dependent)
- submitAssignment ON CONFLICT1068 replaces content/file/time but leaves grade/feedback/graded_at. Under prior Q5 latest replaces previous, changed homework still shows previous grade as if grading new work. Ask if resubmission resets grades or requires version history; do not assume approval.

### B17 — Medium — CSV spreadsheet formula injection (High; Traced)
- export.ts7–11 escapes delimiters/quotes but not = + - @ tab/CR prefixes. Any student-controlled strings? students names admin entered, notes not exported; guardian fields admin entered; still imported/untrusted values can evaluate formula when opened in Excel. Prioritize lower if inputs trusted. Fix export cell formula neutralization with explicit spreadsheet mode; don't alter legitimate phone numbers silently.

### B18 — Medium — Wildcard JaaS token reusable across rooms (High; Traced)
- jaas.ts38 room='*' for all callers, token2h. If student extracts own JWT and knows another room name they can directly connect other JaaS room despite app class guard. Token should bind actual meeting room; browser joining exact room does not enforce wildcard JWT isolation. No remote JaaS tested/configured. Needs parent route context to judge room secrecy.

## Action inventory / writes / surfaces

All `export async` actions in actions.ts are network-exposed Next server actions; TS exports in other modules without use-server aren't automatically endpoints.

Public/auth: seedAdminCredentials24(settings seed); loginAdmin34(read settings/create admin_sessions+cookie); logoutAdmin58(delete session+cookie); loginStudent65(active student check/settings token+cookie); logoutStudent83(delete token+cookie). LogoutStudent uses caller token's student prefix rather than validating equality; a forged token can log other student out (auth105–109), low denial of service.
Admin students: createStudent106 / createStudentQuick136 (students INSERT username/password; /students,/ dashboard); updateStudent166 / Quick191 (students all editable fields,active; detail/list); deleteStudent215 (active0; list/dashboard; doesn't revoke token/share).
Admin classes: createClass231 / Quick267 (classes+notification student; schedule/student/dashboard); updateClass302 (classes schedule/duration/subject/location/status/attendance; schedule/detail); markAttendance325 (attendance and status, detail/schedule/student/dashboard/share); deleteClass343 / Quick356 (class DELETE, cascades reports/class_notes/reschedule_requests, invoice_item.class_id becomesNULL; schedule/student/dashboard); cancelClassQuick368 (canceled absent+notification; schedule/detail/student/dashboard/share); cancelClass746 (canceled absent reason + optional replacement; schedule/detail/student); rescheduleClassQuick479 (new replacement, no original update; schedule/student/dashboard/share).
Admin reports: saveReport394 / Quick434 (reports insert/update and classes completed unless canceled; slightly different invalidation). Unique report.class_id; concurrent first save can fail due select-then-insert.
Admin invoices: generateInvoice531 / Quick627 (invoices header snapshot amount,current hourly rate,invoice_items; schedule? no; invoices/student/dashboard); setInvoiceStatus723(status/paid_at; invoices/detail/dashboard/share); deleteInvoice737(cascade items; invoices only).
Admin recurrences/holidays: createRecurrence779 / Quick815 (recurrences then generated classes skips holidays known now; schedule/student); deleteRecurrence884(delete scheduled classes and recurrence; completed classes preserved with recurrence_idNULL; schedule/student); addHoliday896/deleteHoliday905(holidays only/settings; pre-generated classes never revisited).
Admin notes: addStudentNote913/deleteStudentNote921(student_notes; student detail). Share: generateShareToken929 (invalidate all prior tokens then new token; student detail); revoke938 (active0; detail).
Admin settings: saveSettings946 key whitelist/bulk separate upserts; /settings only; saveDuitNowQR959 data URL size<=512000 settings; /settings,/invoices; remove975 settings delete, /settings only.
Admin classroom: createPostAction983(posts+student notification; classroom/student portal); updatePost1024(posts; classroom/student portal); deletePostAction1012/deletePost1048(posts DELETE cascades attachments/submissions/questions/answers); createTopic1123/rename1136/delete1145(topics; post.topic_idNULL on delete); addPostAttachment1174/delete1190(post_attachments; classroom student only); gradeSubmission1076/gradeSubmissionAction1155(submissions grade/feedback/time; variant invalidation).
Student classroom: submitAssignment1058 (self session only, unscoped post, upsert content/file; both role layouts); submitQuizAnswers1090 (delete prior perpost self answers then inserts; no transaction/unique; both layouts).
Notes: saveTeacherNotes1221(admin,upsert class_notes.teacher); saveStudentNotes1228(student+class ownership,upsert student); saveClassNotes1238 dispatch based scope; saveMeetingNotes1246 admin alias deprecated. No runtime scope whitelist: unknown scope dispatch student, does not grant teacher write.
Reschedule: createRescheduleRequest1252 (unguarded; request+admin notification); approve1279 admin (status/date request, cancel original, create replacement,student notification); reject1323 admin (request reject +student notification).
Notifications: get1349 read recipient scope caller-supplied no guard; mark1364 single no guard; markAll1368 recipient scope caller-supplied no guard.
Exports: exportStudentsCsv20,exportClassesCsv36,exportInvoicesCsv51 each verify admin; joined all rows, no mutation. Upload route as B15.

## Implied lifecycles, domain model and caching

Student: active1=>0 and can admin reactivate via update; historical rows preserved. Credentials generated first-name+suffix password username123; login active check only. Admin multi-session7d server expiry. Student one current settings token, browser7d only, new login invalidates other devices.
Class: scheduled default, mark present/late/null => completed, absent=>canceled; report makes completed except alreadycanceled; direct update may set any enum/string; cancellation any status=>canceled; reschedule creates new row linking original, trial flag lost. No enrollment, tutor, payment ledger, credit, multi-tenant entity.
Invoices: created draft for completed+canceled unclaimed classes, current student hourly_rate snapshot, canceled/trial line amounts0. Any status can be set to any other; paid_at overwritten on paid and cleared otherwise. Hard delete any invoice frees classes. No actual payment records/partial payment/credit/refund/issued period lock. Therefore INV about payment allocations does not apply.
Posts: perstudent orNULL schema, creation requires supplied studentId; four post types, only assignment submission and quiz answer modules; no quiz question creation action remains after dead createPost removed. Topics perstudent but foreign association not checked; due dates no submission enforcement. Latest assignment upsert, latest quiz delete-then-replace; grades retained assignment resubmission.
Reschedule pending=>approved/rejected intended, backend permits repeated/reversed transitions. Admin/student notifications stored SQLite read0/1; recipient adminNULL, studentID but no FK; timestamps SQLite UTC text. Polling consumer parent assesses.
No backend realtime/queue/cron/webhook; shared singleton DB per worker and boolean migrated flag (not a promise); Next revalidatePath explicit pervariant; financial line descriptions/rates/amounts snapshots, dashboards computed live by routes.

## Policy questions (batch, do not reask recorded answers)

Q-B1 Absence/cancellation charging: current markAbsent cancels and generated line zero, trial zero. Is this intended for student absence, tutor cancellation and notice? A keep current alwaysfree (default recommendation for preserving existing behavior); B charge absence but free tutor cancellation (needs separate status/reason); C notice threshold/makeup credits (new model). Affects attendance=>invoice and all share/admin balances. Do not treat snapshot invoices as forbidden automatically.
Q-B2 Corrections after draft/sent/paid invoices: snapshot current generation; cancel/absence correction never updates invoice. Recommend recompute drafts with explicit adjustment for sent/paid (avoids silent historic change); alternative alwaysfreeze or recompute all (risk). Determine canceled invoice frees lesson for rebilling and whether hard deletion paid invoice permitted.
Q-B3 Archived/inactive student: softdelete preservedata recorded Q6, access policy unrecorded. Recommend revoke sessions/deny new writes while optionally provide read-only history; alternative retain full portal until access explicitly revoked. Existing tokens currently full writes.
Q-B4 Resubmission grading: latest replaces previous recorded Q5. Recommend clear grade/feedback on new content requiring regrade; alternative retain prior grade labeled priorversion; version history would be larger change.
Q-B5 Holidays/recurrence: holidays added after classes generated currently do nothing to schedule; no endDate generates only56days with no replenishment. Recommend show explicit generated horizon and offer future pending-class regeneration/cancel confirmation, not silent automatic historical modification. Are holidays meant to cancel existing future sessions, and should open ended recurrence replenish?
Q-B6 Shared post visibility/null student_id and closed submissions: posts permitsNULL but action requires studentId; decide any global assignments? Recommend private scope unless explicit shared semantics. Due-date hard block vs late flag is policy, not infer from due label.
Q-B7 Notifications: should every new/changed/canceled class incl recurrence notify student; parent is token-only no delivery channel. Recommend consistent perstudent event notifications on all paths, no real external sends during test.

## Suggested invariants (12)

I1 Unauthenticated caller cannot mutate records or read private inboxes.
I2 Student write target post/class belongs to authenticated student (or explicitly shared post policy).
I3 Invoice total equals sum of line item amounts and quantity*unit_rate within chosen currency rounding.
I4 Each lesson has at most one active invoice claim (void/rebill policy explicit).
I5 Failed composite mutation leaves domain tables unchanged.
I6 Resolved reschedule request processed at most once; request.student matches class.student.
I7 Rescheduling preserves trial/free classification and correct class owner.
I8 Every video-enabled scheduled lesson has a unique room and starts unmarked attendance.
I9 User-entered10:00MYT is stored02:00Z and renders10:00MYT everywhere; date-period boundaries use MYT.
I10 Finite valid recurrence always terminates within bounded allowed horizon; no date/day/duration invalid domain.
I11 Student deactivation behavior matches explicitly chosen access policy; expired sessions never authenticate.
I12 Historical financial documents only change through chosen draft/issued correction policy; canceled invoice rebill/deletion behavior explicit.
