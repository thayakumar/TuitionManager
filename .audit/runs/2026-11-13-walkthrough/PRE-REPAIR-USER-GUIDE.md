# TuitionManager — User Capabilities and Business Use-Case Test Guide

**Current code inspected:** `d8a74b5` · **Walkthrough:**13 November2026 · **Business timezone:** Asia/Kuala_Lumpur.

This guide describes **what the current app allows each person to do, what the action changes, and what other pages or people should see afterward**. Use it to understand the app and as a manual acceptance checklist. It does not claim every hypothetical combination has been executed.

The numbered entries follow **“As an Admin/Student/Parent, I can [action] → [result]”**. Each explains dependent records/screens, important alternative outcomes and evidence. **Browser verified** means actually clicked against the local production build with fake data; **Code traced / manual pending** means implementation was inspected but the whole UI journey was not executed; **Unavailable** means no working user-facing control exists; **Known failure** means a business expectation or UI behavior failed. “Can” describes an exposed capability, not a promise that every variation works.

## Quick role map

|User|Capabilities currently exposed|Not currently exposed|
|---|---|---|
|Admin / tutor|Manage students, schedule lessons, attendance/reports, classwork/grades, invoice status, reschedule decisions, parent links, settings/holidays|No complete recurring-series management screen; no payment transaction/refund ledger; no working scheduled browser reminder system|
|Student|Own schedule, reschedule request, classwork submission, returned grades, private class notes, inbox, profile|Cannot directly cancel a lesson, approve requests, mark attendance, edit fees, pay/modify invoices, or resubmit through the current post-submission screen|
|Parent/guardian|Read-only child dashboard, schedule, attendance, class reports and invoices; print/PDF|Cannot cancel/reschedule, submit work, grade, alter payment status or edit profile; no separate parent account|

**Important example:** “Student cancels a lesson” is not a current button. The actual journey is **Student requests a new time → Admin approves/rejects → schedule and notifications reflect that decision**. Request creation alone must not move or cancel the lesson.

## Your confirmed business rules

1. Absences are not charged.
2. Canceled lessons must not appear on an invoice, including zero-value lines.
3. Invoices are made at month-end. You said post-invoice corrections are outside your normal workflow; this guide does not invent a correction/credit-note policy.
4. Stopping a recurring schedule should cancel future lessons and preserve history. Current backend removal fails this, and there is no visible series-stop screen.
5. Existing earlier decisions about retaining historical student data and latest assignment submission replacing previous work remain recorded. Where the UI contradicts those decisions, the guide flags it.

## How to test a business case

Use three separate browser sessions: Admin, affected Student, and Parent via that student's link. Record the starting class/post/invoice and status. Perform the numbered action; verify the acting user's result; check every listed dependent page in the other sessions; reload to check persistence; check another student's records did not change. Record PASS, FAIL, BLOCKED or NOT RUN in the accompanying CSV worksheet. Existing tabs usually need reload: there is no general realtime synchronization system.

Do not test cancellation, invoice generation/deletion or hostile data against live production. This walkthrough used isolated fake local data. External file storage and video were not exercised live; print calls were intercepted and no messages/payments were sent.

## Contents

1. Admin: access, roster, notes, classroom, grades, settings, calendar, attendance, reports, cancellation, recurring schedules, invoices, requests and notifications.
2. Student: access, dashboard, schedule/request outcome, classwork/submission/feedback, notes, inbox, profile and mobile navigation.
3. Parent: shared access, dashboard, attendance, schedule, reports, invoices/printing and revocation.
4. Connected business journeys and worked examples.
5. Missing capabilities and important unresolved business choices.
6. Testing evidence, performance findings and visual redesign proposal.

## 1. Admin / tutor

### 1.1. Sign in, move around and sign out

#### 1.1.1. As an Admin I can sign in → open my management dashboard
Open `/portal/admin`, enter admin credentials and choose Sign In. The app opens `/`; the navigation offers Students, Schedule, Invoices, Classroom, Requests, Notifications and Settings. The database stores a new admin session; it does not change any student's records. **Tester checks:** reload still authenticated; student login does not confer admin access; wrong credentials show a recoverable error; signing in on another admin device should coexist per existing multi-device policy. **Evidence:** valid login Browser verified A01. Remaining variants Code traced, backend/role audit owns authorization results.

#### 1.1.2. As an Admin I can use the desktop sidebar or mobile menu → open another management page
Use a navigation link, collapse/expand the desktop sidebar, or open the mobile hamburger and select Students. Sidebar collapse preference is local browser state; business records do not change. **Tester checks:** correct route and active link; keyboard access; drawer closes after navigation; mobile content remains usable without horizontal scrolling. **Known UX result:** mobile Students link navigates successfully but drawer remains open in Browser A23; tester must dismiss it. Do not call this business data loss.

#### 1.1.3. As an Admin I can log out → end this device's admin session
Choose Logout. You return to `/portal/admin`; opening `/students` again should redirect to login. Other users' sessions and student data must remain intact. **Evidence:** Browser verified A24. A second admin device should remain logged in (Code traced).

### 1.2. Student roster and profile

#### 1.2.1. As an Admin I can open Students → see active/inactive counts, rates and student profiles
Open `/students`, inspect roster totals, then select a student. Profile displays contact/guardian details, credentials, upcoming/history classes, invoices, attendance, teacher class notes, reports and administrative student notes. **Tester checks:** counts match displayed rows; every list/detail links to the same student; someone else's history must not appear. Changing filters/reading screens must not mutate records. **Evidence:** roster/profile Browser verified A02–A04; detailed formulas Code traced in `app/students/page.tsx` and `app/students/[id]/page.tsx`. Attendance denominator excludes canceled/absent classes in profile; consult main audit cross-screen finding before treating percentage as a reliable all-lessons attendance rate.

#### 1.2.2. As an Admin I can add a student → create a roster record and portal credentials
Students → Add student. Enter name, subject, level, hourly rate and optional contact/guardian/notes; choose Create Student. Result: profile opens, student is active, credentials are generated from the first name with username collision handling. **Dependent records/screens:** `students` row; Students counts; dashboard active count; scheduling/invoice pickers; Classroom directory; student portal credentials. No class or invoice should be created merely by adding a student. **Tester checks:** new student appears after full reload; old students unchanged; duplicate first names get distinct usernames; zero rate remains zero; malformed/negative rates and whitespace names need validation checks. **Evidence:** Browser A03 created own student3 at RM80; blank-name required state A02 passed. Credentials convention is an existing business decision, not silently changed by this audit.

#### 1.2.3. As an Admin I can edit a student → update their current profile and future calculations
Profile → Edit. Change name/contact/subject/level/rate/notes/Active and save. **Dependent screens:** roster, profile, scheduling labels, classroom banner, student and parent identity/contact displays; future invoice generation reads current hourly rate. **Tester checks:** save then reload; student/parent see updated identity on reload; already-created invoice line unit prices/totals should stay frozen unless explicit adjustment policy says otherwise; unbilled historical lessons currently use the newly saved rate when first invoiced. Name edits do not regenerate existing credentials. **Evidence:** grade/phone edit Browser A04; rate/history consequences Code traced (`updateStudentQuick`, invoice generation). Rate effective date is a business-policy question.

#### 1.2.4. As an Admin I can deactivate or delete a student → hide active enrollment while retaining history
Edit profile and uncheck Active, or visit `/students/{id}/edit` and choose Delete. Delete is implemented as `active=0`, not physical removal, per prior decision. **Dependent surfaces:** active roster counts and scheduling/classroom lists should remove the student; past invoices, reports and lessons should remain readable to authorized admin. **Tester checks:** no cascade deletion of financial history; student already logged in should lose access if deactivation means withdrawal; future lessons should follow chosen withdrawal policy. **Known gap:** current session verification does not itself revoke inactive student sessions (see main audit). Delete is available on legacy full Edit page, whereas profile Edit opens a modal without a Delete button. **Evidence:** Code traced only; not executed on shared fixtures.

#### 1.2.5. As an Admin I can copy login information → share portal access instructions manually
Profile → Copy login info. Clipboard receives portal URL, username and password. No automatic message is sent. **Dependent surface:** student uses supplied credentials at `/portal/student`; no other student's credential should be included. **Tester checks:** paste into a private local text field, verify URL and intended student; blocked clipboard should show failure rather than false success; avoid real messages during audit. **Evidence:** Browser A07 verified clipboard structure without logging credential values.

#### 1.2.6. As an Admin I can export the roster → download a CSV
Students → Export CSV. Browser downloads roster data. **Dependent behavior:** read-only export; student records and invoice amounts must remain unchanged. **Tester checks:** exported rows match roster scope; quoted commas/newlines work; spreadsheet formula strings must not execute when opened; unauthorized roles cannot use export action. **Evidence:** Browser A10 downloaded `students.csv` and found own student; content edge/security handling separately audited.

### 1.3. Administrative student notes and parent access

#### 1.3.1. As an Admin I can add a student note → append an administrative timeline item
On profile, enter a note and choose Add note. New `student_notes` row appears with creation time. **Dependent surfaces:** profile note list and its count; this is distinct from per-class teacher/student private meeting notes. It must not appear in another student's notes or automatically become a parent classroom report. **Tester checks:** reload persistence; multiline/long text; correct student; blank note rejected without losing existing notes. **Evidence:** long note Browser A05; ownership/read paths Code traced.

#### 1.3.2. As an Admin I can search and expand notes → find complete historical text
Type a content/date search; matching notes remain; expand Show more to read long note. No records change. **Tester checks:** “No notes match your search” differs from no notes in account; count agrees; clearing query restores list; time matches business timezone rather than browser/server disagreement. **Evidence:** Browser A05 expanded, searched no-match and restored 1of1 count.

#### 1.3.3. As an Admin I can delete a note → remove that note from the profile
Use note trash action. **Dependent records:** delete selected `student_notes` only; do not remove class notes, reports, or other student's notes. **Tester checks:** reload confirms removal; other entries remain; destructive control accessible without mouse hover/touch. **Evidence:** Browser A06 removed own note and verified No notes yet. No confirmation/pending affordance exists in current note component (Code traced).

#### 1.3.4. As an Admin I can generate/copy a parent link → grant read-only access to one student's information
Profile → Generate parent link → Copy parent link. Open copied `/share/{token}` in separate unauthenticated parent session. **Dependent records/screens:** active `share_tokens` row; parent dashboard/attendance/schedule/reports/invoices become accessible for linked student. Generating another token invalidates previous active tokens. **Tester checks:** parent can view correct student only, cannot edit, cannot substitute another invoice ID; admin-only credentials/private class notes absent; no real sharing during audit. **Evidence:** Browser A08 generated/copy link and parent dashboard matched own student; full portal isolation audited separately.

#### 1.3.5. As an Admin I can revoke a parent link → stop future access through that URL
Choose Revoke link. UI returns to Generate parent link. Reopen old URL in parent browser. **Dependent records:** tokens for student inactive; parent pages should fail after refresh; historical invoices remain in admin DB. **Tester checks:** currently open parent page cannot continue retrieving protected data; generating a replacement must not reactivate old link; other families' links unaffected. **Evidence:** Browser A09 old link returned404. Already rendered browser content cannot be erased remotely; that is distinct from continued authorized access.

### 1.4. Classroom topics and content

#### 1.4.1. As an Admin I can open Classroom → select an active student's classwork and grades
Open `/classroom` then student's classroom. Classwork groups Material, Assignment, Announcement and any existing Quiz posts by topic; Grades tab summarizes assignments/quizzes. **Dependent surfaces:** student's `/portal/student/{id}/classroom` should show only their work and same submission/grade facts; parent share portal does not expose classroom navigation. **Tester checks:** empty classwork and no submissions states; counts match; no wrong-student post detail when IDs are altered. **Evidence:** Browser A11/A17; cross-ID authorization separately audited.

#### 1.4.2. As an Admin I can create a topic → organize existing/new classwork
Choose Create topic, enter name and confirm/Enter. Topic row is added to student's `topics`; classroom gains section. **Dependent surfaces:** post topic dropdown; student classwork topic sections after reload. No post should be silently reassigned. **Tester checks:** topic belongs to current student; blank name rejected; sorting stable; same-name policy explicit. **Evidence:** standalone create Browser A14.

#### 1.4.3. As an Admin I can rename or delete a topic → change organization without deleting work
Topic overflow menu → Rename or Delete. Rename updates topic label. Delete removes grouping; posts referencing it should become No topic through FK behavior rather than disappear. **Dependent surfaces:** admin/student classwork and post dropdowns. **Tester checks:** all attached posts remain reachable; other students' topic and posts unchanged; deleting topic should not delete submissions/grades. **Evidence:** Code traced; not browser executed in this batch. Current Delete topic has no explicit confirmation. FK assumptions verified by schema auditor, not claimed from UI alone.

#### 1.4.4. As an Admin I can create a topic inside New Post → expect to select it immediately
New Post → choose type → Topic New → enter name and confirm. **Expected outcome:** new topic selectable in same open form; save should place post under chosen topic and student's classroom should agree. **Known bug, Browser verified A15:** topic is created and toast says success but open dropdown still lists old options because localTopics snapshots props. Close/reopen modal works around it. Tester must check both the new topic record and final post.topic_id; toast alone is insufficient.

#### 1.4.5. As an Admin I can post Material → give one student learning content
New Post → Post Material. Enter Title, Content and optional Topic, then Post. **Dependent records/screens:** `posts` row type material, target student's classwork, student inbox new-post notification. No invoice/class attendance should change. **Tester checks:** exact student sees material after reload; other student doesn't; special characters displayed as text; blank title prevented. **Evidence:** Browser A11 created material with script-like text safely displayed; blank title blocked. Notification dependency Code traced (`createPostAction`).

#### 1.4.6. As an Admin I can post an Announcement → notify one student's classroom
New Post → Post Announcement; enter title/body/topic. **Dependent records:** announcement post and student announcement notification. **Tester checks:** topic grouping and inbox link open same content; editing announcement doesn't create duplicate new-post notifications unless explicitly intended. Other students remain unaffected. **Evidence:** Browser A22 created and listed announcement; notification recipients Code traced.

#### 1.4.7. As an Admin I can create an Assignment → request work and set due date/max points
New Post → Post Assignment; enter title, instructions, points, optional due date/topic. **Dependent surfaces:** admin classwork and Grades entry; student Assigned/Missing state and submission form; new-assignment inbox entry. **Tester checks:** due time agrees between entered field, server, admin and student in Asia/Kuala_Lumpur; points determine numeric grade range; empty work remains Not submitted until actual submit completes. **Evidence:** Browser A16 created assignment with100 points and due local15:00; screenshot showed due23:00, demonstrating existing naive-server-time parsing risk; root audit owns timezone finding. A17 validated Instructions/Student Work tabs and no submission state. UI initially captured stale URL in harness; correct post ID must be discovered from settled href before cross-role tests.

#### 1.4.8. As an Admin I can edit a post → update instructions visible to the student
Open post → pencil → update title/body/topic/(assignment points/due) → Save Changes. **Dependent records:** same post ID updated, updated_at shown; student list/detail should reflect after reload. Existing submission contents must remain intact. **Tester checks:** retitling does not duplicate post; changing max points after grading needs clear policy for existing score; original/current due times must not shift accidentally when saving without edit. **Evidence:** material edit/reload Browser A12; assignment policy aspects Code traced.

#### 1.4.9. As an Admin I can delete a post → remove content and dependent classroom records
Open post → trash → confirmation → Delete. Cancel should leave it unchanged. **Dependent records:** post deleted; attachments/questions/submissions may cascade; student classwork removes entry. Old inbox link may become404 because notifications aren't cleaned up (see main audit). **Tester checks:** correct student/post; retained grades policy before deleting submitted assignment; parent invoices unrelated. **Evidence:** Code traced; first browser attempt had wrong icon selector (harness failure), not a confirmed product failure. Follow-up delete journey will be recorded separately.

#### 1.4.10. Quiz creation and admin attachment upload are not exposed as ordinary current UI flows
Existing model supports Quiz, quiz answers and post attachments, but New Post menu offers Material, Assignment, Announcement only; admin post modal has no question builder or attachment uploader. **Tester guidance:** mark “Unavailable in current UI,” not Pass and not an invented button. Existing quiz/attachment records may render. Backend functions do not prove end-to-end business capability.

### 1.5. Receiving student work and returning grades

#### 1.5.1. As an Admin I can view work a student turns in → review their answer/link/file
Student signs into separate portal, opens assignment, types work and chooses Turn in. Admin opens same assignment → Student Work. **Dependent records/screens:** `submissions` row, student Turned in state, admin work tab/count, classwork badges and grade list. **Tester checks:** await successful submission, then reload both sessions; never infer persistence from text still in textarea; wrong-student submissions invisible. File upload requires external Apps Script service and is blocked/unverified in local environment; do not send real files. **Evidence:** own text submission Browser A18 persisted on full reload; grade companion recheck corrects fixture ID before claims.

#### 1.5.2. As an Admin I can return a grade and feedback → student receives evaluated work
Student Work → enter score/letter and feedback → Return; later Update Grade. **Dependent records:** grade, feedback, graded_at; admin submission card and Grades tab; student assignment card/detail shows same score/feedback. **Tester checks:**85 of100 persists;0 is not treated as empty; negative/above-max invalid unless extra credit policy; letters only when assignment has no numerical maximum; grading student A cannot change student B's work. Current implementation writes grade without server range validation; standalone input min/max isn't enforced by button click. **Evidence:** Browser verified on correct own assignment post8:999/100 was accepted and persisted (A19 FAIL), then85/100 with feedback saved and reloaded successfully (A20 PASS). This is a real range-validation defect, not just a trace.

#### 1.5.3. As an Admin I can inspect the Grades tab → compare assignment status and scores
Classroom → Grades. Each assignment/quiz displays due, points, score and status Assigned/Missing/Submitted/Graded. **Tester checks:** same score/detail/student result after reload; due-time Missing logic matches timezone; no old grade shown as current if student replaced submission. **Evidence:** Browser A21 PASS: Grades table agreed with persisted85/100 detail after reload.

#### 1.5.4. Student resubmission is supported by backend policy but not offered after current UI shows submitted work
Prior decision says latest work replaces previous. Once submission exists, student detail displays submitted work instead of a fresh SubmissionForm. **Tester checks:** explicitly look for Resubmit/Edit work button; if absent, mark UI capability unavailable even though server upsert exists. If testing action directly, grade/feedback reset policy must be specified; never assume old grade belongs to new contents. **Evidence:** Code traced and browser revisiting own submitted assignment found no input form. Business-policy mismatch tracked in audit.

### 1.6. Business settings, holidays, payment QR and reminder controls

#### 1.6.1. As an Admin I can save business details → update invoice/shared-page branding and instructions
Settings → edit Business name, Currency, Contact, Payment instructions → Save settings. **Dependent surfaces:** invoice view/print, parent shared pages and currency labels throughout. Existing numerical amounts are not converted when currency symbol changes. **Tester checks:** reload settings and representative invoice/parent view; other student's numerical invoice totals unchanged; historical sent invoices may show newly changed business text because settings are read live. **Evidence:** Browser follow-up B03 saved a temporary business name, reloaded it, verified parent branding and restored the original setting afterward. Historical document snapshot policy remains separate; no production data was changed.

#### 1.6.2. As an Admin I can add a holiday → future recurrence generation skips that date
Settings → Holiday name/date → Add. `holidays` receives date. **Dependent behavior:** future calls to recurring-class generation consult holiday list; existing one-off classes and previously generated recurring lessons are not automatically canceled. **Tester checks:** generate an own recurring schedule spanning fake holiday and count skipped date; already scheduled lesson remains unless intended otherwise; duplicate date should not create duplicate holiday; other dates unaffected. **Evidence:** Browser follow-up B04 added a fake holiday and verified the generated series skipped it; the holiday was removed after testing. “Auto-skipped” applies to generation, not retroactive removal.

#### 1.6.3. As an Admin I can delete a holiday → future recurrence generation can include it again
Holiday trash action removes holiday record. **Dependent behavior:** newly generated schedules no longer exclude date; previous skipped lessons are not automatically created. **Tester checks:** no unexpected historical schedule rewrite; future generation includes correct weekday/date. **Evidence:** Code traced. No holiday edit button; replace by delete/add if needed.

#### 1.6.4. As an Admin I can upload/remove a DuitNow QR → change the code shown on invoices
Settings → select image → Upload QR; preview appears. Remove QR removes setting. **Dependent surfaces:** invoice/print QR and future parent invoice views. No payment is collected or marked paid simply by displaying QR. **Tester checks:** tiny fake image renders; remove eliminates QR on reload; wrong MIME and oversized file fail accessibly; preserve old QR on failed upload. **Known mismatch:** UI advertises2MB; backend enforces500KB. Do not call a0.5–2MB rejection user error; label must agree. **Evidence:** Code traced; local upload not executed to avoid altering global shared fixture. QR storage is separate from external student attachment service.

#### 1.6.5. As an Admin I can request browser notification permission → receive a one-off confirmation, not functioning scheduled reminders
Settings → Notifications → Enable. Browser permission prompt may allow/deny; confirmation may fire. **Dependent state:** browser permission only; there is no backend reminder subscription/worker. **Known implementation gap:** current UI promises upcoming class reminders but no timed scheduler exists. **Tester checks:** distinguish in-app stored notifications from browser push; changing permission must not change class status; denied state explains browser settings; real reminder journey currently unavailable. **Evidence:** Code traced; no real external notification sent during audit.


### 1.7. Schedule/calendar


**A-S01.** **As Admin, I can open Schedule and see lessons by student, date and status.** Select a student with scheduled, completed and canceled lessons. Check each class is represented once, its color matches status, and its detail date matches student/parent schedules. Dependencies: active students and classes; read-after-write: admin calendar, student calendar/list, parent schedule, dashboard. **Browser verified:** classes render and detail opens. **Failed consistency:** entering Nov25 16:00 in a Kuala Lumpur browser stored 16:00Z and detail displayed Nov26 00:00, while server-rendered class/invoice text displayed Nov25 16:00.

**A-S02.** **As Admin, I can click Previous, Next and Today to move the calendar.** Wait for the title/grid to finish updating, verify a month/year boundary, and return Today. These controls only navigate, never move lessons. **Browser verified:** controls work. One fast script read a title before the React update settled; do not classify that as a product bug.

**A-S03.** **As Admin, I can choose Month, Week, Day, 5 days and Agenda.** Check the same lesson appears at the same business time, not just a matching number of rows. **Browser verified:** all five views changed successfully. Week/day use custom scrollers but the expected viewport selector is absent; starting/imperative/autoscroll integration is defective. Previous audit's trigger mismatch affects styling/tooltips, not the ability to open the menu.

**A-S04.** **As Admin, I can click an empty day and schedule one class.** Choose UICalendar, date, time, duration, subject/location and optional trial flag; save once. Expect one class, same owner, correct duration/time, and a meeting room. Read-after-write: admin schedule/class detail/student detail/dashboard, student/parent schedules. **Browser verified:** own class created and persisted. Timezone defect described in item1 applies.

**A-S05.** **As Admin, I can cancel opening the Schedule Class dialog without creating a class.** Use Cancel, Close, Escape; reopen and check the selected day and stale form values. **Browser verified:** Cancel and Escape paths exercised. A captured immediate dialog count included closing animation, not a stuck dialog.

**A-S06.** **As Admin, I must choose a student before submitting a new class.** Submit with no student and confirm an inline/browser validation message with no new row. **Browser verified:** required select rejects and shows “Please select an item in the list.” Also manually test missing date, impossible date, zero/negative duration, inactive student, double-click, conflicting time and network failure. Server-side authorization/validation must apply even if UI is bypassed; some of these remain audit findings.

**A-S07.** **As Admin, clicking a class opens its summary and allows View full details/Edit.** Check student, subject, duration, meeting link, location, trial badge, status, attendance and private teacher note. **Browser verified:** summary and View full details navigate correctly for own class. Private teacher notes must stay absent from student/parent routes.

**A-S08.** **As Admin, I can copy the meeting link and open the intended lesson meeting.** Copy must confirm actual clipboard success, and pasted URL must route both roles to the same authorized room. **Browser verified:** copy button clicked. **Not verified:** OS clipboard success/actual third-party call; external meeting navigation deliberately not launched. Links currently use public meet.jit.si room names even when JaaS may be configured; compare with the meeting-page configuration before accepting.

**A-S09.** **As Admin, I can drag or resize a lesson only if the app supports saving that change.** Move one own lesson, reload, then inspect student/parent schedule and DB; resize and confirm billing duration follows intended policy. **Browser verified failure:** dragged own lesson to Nov28; detail remained Nov26 and DB unchanged. The UI permits a gesture but its controlled event callbacks do not persist. Current workaround: explicit cancel/reschedule. Decision: implement persisted rescheduling or disable these gestures.

**A-S10.** **As Admin, I can drag-select a range only if it opens a creation flow for that range.** Verify start/end populated and Cancel makes no class. **Browser verified failure:** drag-select showed no dialog and left no draft after release; onSelectSlot is unwired. Decide support vs disabling affordance.

**A-S11.** **As Admin, I can use +N more to inspect all lessons on a busy day.** Ensure no missing/duplicated entries, page remains navigable, long lists scroll and Escape closes. **Manual browser check pending:** overflow maximum-height styling targets the missing ScrollArea viewport attribute. Parent/student records must not be mixed in.

**A-S12.** **As Admin, I can export the schedule to CSV.** Open/download, compare owner/time/status/attendance with the calendar, verify quotes/newlines and whether export scope is all classes or visible range. **Browser verified:** classes.csv downloaded. Full formula/date comparison is a separate manual check. CSV is an export, not proof of browser filtering.

### 1.8. Class details, attendance, reports


**A-S13.** **As Admin, I can mark a lesson Present.** Expect attendance=present and status=completed; admin class/student/dashboard agree, student/parent show Present after refresh. At RM80/hour and 60 minutes the unbilled eligible amount is RM80. **Browser verified:** Present button worked for own class. Future lessons can currently be completed; business decision needed on whether future marking should be prohibited.

**A-S14.** **As Admin, I can mark a lesson Late.** Expect attendance=late, status=completed and consistent labels. Clarify whether late changes billable duration; current implementation still charges full duration. **Browser verified:** Late worked. **Lifecycle concern:** it also resurrected a canceled own lesson as Completed, because the controls remain enabled on canceled lessons.

**A-S15.** **As Admin, I can mark a lesson Absent.** Current implementation sets attendance=absent and status=canceled; invoice generation includes it as a zero-rate/zero-amount canceled line. **Your confirmed rule:** absences are free and canceled lessons must not appear on invoices at all. Current zero-value canceled lines violate that rule; a completed-but-absent record can be charged incorrectly. **Browser verified:** Absent button succeeds. Check dashboard, attendance percentage, student schedule and parent attendance use the same definition; absence is not merely a cosmetic label.

**A-S16.** **As Admin, I can correct attendance after a mistake.** Present→Absent→Present must change all read surfaces coherently; existing issued/paid invoice must remain a snapshot or receive an explicit agreed adjustment. **Browser verified:** Canceled→Late changed to Completed. **Policy-dependent:** lock/edit rules after invoicing, cancellation reason retention and correction notifications are not settled by that successful click.

**A-S17.** **As Admin, I can write a post-class report.** Fill topics, homework, strengths, improvements, performance, next focus and rating1–5, save, reload and verify exactly one report. Read-after-write: class detail, dashboard pending-report count, parent reports, classroom/student surfaces that actually expose reports. Current save marks non-canceled class Completed. **Browser verified by follow-up B01:** saved topics/homework persisted, class became completed and the parent Reports page showed the same report. Cancellation remains preserved by the action; no report save should silently resurrect a canceled lesson.

**A-S18.** **As Admin, I can update a report without erasing its previous content accidentally.** Reopen both inline and quick report UI; fields should be prefilled, change one field and check unchanged fields survive. **Browser failure B02:** after saving a report, opening the quick-report dialog showed blank topics rather than existing content. Saving that form risks replacing existing fields with blanks. The inline form is prefilled; use it as a workaround. Required business outcome is safe editing, not only a toast.

**A-S19.** **As Admin, I can close the quick report without saving.** Escape/Close should return to the class and remove report=true; a subsequent open should show an editable form, not stale “Report saved” state. **Manual check pending.**

**A-S20.** **As Admin, I can edit class date, duration, subject, location, status and attendance.** Save, reload, compare all related views and recompute future billing correctly. Check one changed field does not reset unrelated state; completed/canceled status must not contradict attendance. **Code traced / manual check pending:** status and attendance are independently submitted; no transition/state invariant prevents contradictory combinations.

**A-S21.** **As Admin, I can open teacher notes from a meeting without showing those notes to students.** Saving/refreshing must preserve scoped teacher vs student notes, and unsaved text on leave should have a clear outcome. **Delegated:** meeting/privacy browser checks belong to other role tester/root; third-party call not performed here.

**A-S22.** **As Admin, I can delete a class from its danger zone only after understanding historical impact.** Verify confirmation, cancellation vs deletion distinction, reports/invoice references, totals, CSV and all role schedules. **Manual destructive check pending:** hard-delete exists on class detail; do not assume invoice history survives without checking FK behavior. Calendar trash is different (item24).

### 1.9. Cancellation and rescheduling


**A-S23.** **As Admin, I can cancel a scheduled class with an optional reason.** On class detail choose Cancel class, type reason, confirm or Never mind. Expected business result: original stays visible as canceled with reason; attendance/charge/notification follow agreed policy. **Code traced / manual browser check pending** for detailed form. Quick calendar cancel **browser verified** via trash path below.

**A-S24.** **As Admin, I need the calendar trash button's outcome to match its label.** **Browser verified failure:** a button titled Delete opens “Reschedule Class?” after cancellation; it does not delete the class, and the class remains in the calendar. Proposed UX: rename icon/action to Cancel class and require clear confirmation, reserving Delete for actual irreversible deletion.

**A-S25.** **As Admin, after cancellation I can choose No thanks and leave the original canceled.** **Browser verified:** No thanks closes reschedule dialog and original remains. Check notification once and student/parent canceled status; don't treat this as a hard delete.

**A-S26.** **As Admin, I can cancel and create a replacement at an explicit date/time.** Expected original canceled, exactly one new scheduled class, same student/duration/location, rescheduled_from link, preserved trial flag, fresh valid meeting room, no duplicate billing or notification. **Manual calendar reschedule check pending** after a harness locator interruption; **cross-role request approval path browser verified** in item43. Earlier audit traces identify trial/meeting inconsistencies across reschedule paths.

**A-S27.** **As Admin, I can abandon a pending cancellation/reschedule.** Never mind/Close must leave DB unchanged before confirmation; after cancellation is committed, closing the second dialog does not restore the original. UI should make this distinction explicit. **Browser verified:** closing No thanks after committed quick cancellation keeps cancellation.

**A-S28.** **As Admin, I can move a lesson only to a valid available time.** Try conflicting existing lesson, past date, same time, overlap around midnight and double-submit. No duplicate replacement or double-booking; other students stay unchanged. **Manual scenario pending:** current backend lacks comprehensive conflict enforcement; policy on tutor-level vs per-student overlap must be recorded.

### 1.10. Recurring schedules and holidays


**A-S29.** **As Admin, I can open Recurring from Schedule and choose a student, weekdays, time, duration, frequency and start/end dates.** Create a weekly Friday series over a short fake range; expected one class on each included Friday, none outside range, correct subject/location/time, unmarked attendance until held and a usable meeting room. **Browser verified B04:** short weekly series and holiday skipping persisted. Business defects remain: generator sets future attendance=present and omits meeting_room; do not accept a success toast as readiness.

**A-S30.** **As Admin, I can create multiple weekdays and biweekly/custom series.** Verify each generated date against a hand-written expected list, especially first weekday, last inclusive day and 4/5-week months. Custom interval must be positive; zero/negative must not hang or create runaway rows. **Manual check pending; never execute negative interval on shared server** because static trace identifies loop risk.

**A-S31.** **As Admin, I can leave an end date blank and understand how far ahead generation runs.** Current generator creates about eight weeks (56 days), not an indefinitely self-extending schedule. UI should disclose this horizon or provide extension. **Code traced.**

**A-S32.** **As Admin, I can cancel recurring setup before saving and correct missing days.** No selected weekday must show a clear validation error and create no recurrence/classes. UI marks Days required but HTML checkboxes do not enforce at least one; server throws a generic production error. **Code traced / browser pending.**

**A-S33.** **As Admin, I can add a holiday before generating a series.** Verify exact-date matches skip that day's classes while adjacent weeks remain. Dependencies: Settings holiday list and recurrence generator. **Browser verified B04:** adding a December4 holiday then generating a Friday series for December4–11 produced December11 only. Existing-class cancellation remains a separate policy.

**A-S34.** **As Admin, adding/removing a holiday after a series exists must have an explicit effect.** Current code does not retroactively cancel/recreate existing lessons. If staff expect it to, show preview/confirmation and consistent notifications; otherwise clearly state “future generation only.” **Policy-dependent; code traced.**

**A-S35.** **As Admin, I should be able to stop or edit a recurring series safely.** Find a visible management control, show affected future lessons before confirmation and retain completed history. **Current reachability gap:** deleteRecurrence server action exists but no user-facing management control found. Your rule is cancel future lessons and preserve history; the backend-only action currently hard-deletes all scheduled children, including past uncompleted lessons, which fails that rule in isolated module execution. No browser stop action can be claimed. Backend removal deletes scheduled children, not completed/canceled children; check FK references to retained history.

### 1.11. Invoice generation and review


**A-S36.** **As Admin, I can generate an invoice for one student and explicit period.** Given one completed60min class at RM80/hr, generate Nov1–Nov30. Expect one invoice/line with RM80, correct student, immutable description/rate snapshot, no other student's classes. **Browser verified:** own invoice3 created for RM80. **Date defect:** selected Nov30 end displayed Dec1 on server-rendered document; business period should not appear to extend a day.

**A-S37.** **As Admin, invoice dialog defaults must describe the current local month.** In Kuala Lumpur, November defaults should be Nov1/Nov30. **Browser verified failure:** actual inputs default Oct31/Nov29 due to local midnight → UTC date slicing.

**A-S38.** **As Admin, invoices should show canceled and trial lessons according to policy.** Current behavior includes completed/canceled classes, canceled/trial amount0 and normal completed amount=duration/60×current student hourly_rate; scheduled classes excluded. **Your confirmed rule:** omit canceled lessons and never charge absence. Existing trial policy is zero price; whether a rescheduled trial keeps that classification is still a separate decision. **Code traced / policy-dependent.** Verify header total equals sum of lines and rounding at fractional duration/rate.

**A-S39.** **As Admin, generating the same already-billed period must not double-bill lessons.** **Browser verified:** repeat generation produced an error and no second invoice for own class. **UX failure:** dialog displays generic production Server Components error/digest rather than “No un-invoiced classes in this period.” Concurrency and partial-failure atomicity are separate earlier audit findings.

**A-S40.** **As Admin, reversed/missing/invalid periods should explain what to correct.** **Browser verified:** startNov30/endNov1 was accepted by form then returned generic production error, no field-specific “end before start” message. Existing invoice history unaffected. Required fields get browser constraints, but cross-field validation is missing.

**A-S41.** **As Admin, I can inspect invoice details, Student link and return to the list.** Verify bill-to, student/guardian contact, business/payment settings, dates, hours/rate/amount, notes, QR, and total against source classes; copying/printing must not expose private teacher notes. **Browser verified:** detail and Student link work; amountRM80 checked. QR and multiple line/rounding manual checks remain.

**A-S42.** **As Admin, fee or attendance edits after invoice generation must follow a clear adjustment policy.** Change student rate or lesson duration/status and inspect existing invoice versus a new invoice. Snapshot amount must not silently drift; canceled invoice may or may not release classes for rebilling. **Month-end workflow recorded:** you said post-invoice correction will not occur; no adjustment feature is being invented. Existing invoice lines remain snapshots, and the anti-duplicate query currently blocks classes even if the original invoice is canceled. Deleting an invoice releases them.

### 1.12. Student reschedule requests and notifications


**A-S43.** **As Admin, I can review a student's pending request and approve a chosen option.** View original lesson, requester, reason and preferred times; select option then Confirm Approval; Cancel before confirmation leaves pending. **Browser verified cross-role journey:** approved Alice request3 option1=Dec2 10:00Z with note “UIAUDIT approved first option”. DB originalclass4 canceled, newclass6 scheduled with owner1, same duration and rescheduled_from4, is_trial0; requestapproved_time saved; student notification13 created. Student tester verifies schedule/parent and notification views separately.

**A-S44.** **As Admin, I can reject a request with a useful note.** Confirm Rejection must leave original/replacement timetable unchanged and notify only requester. **Browser verified:** rejected Alice request4 with “UIAUDIT alternate declined”, request rejected/resolved_at saved, student notification14 contains note. Approval/rejection card choice mapped to exact DB order to avoid acting on another request.

**A-S45.** **As Admin, duplicate requests for the same class need a coherent resolution.** After approval, other pending alternatives must not allow duplicate make-up classes without an explicit decision. **Observed:** student tester created duplicates2/3/4 for sameclass4; approving3 did not remove other pending requests. Rejecting4 was explicit separate action. Manual check remaining: attempt second approval only in a fresh isolated scenario, not on shared fixtures.

**A-S46.** **As Admin, approved/rejected requests should become read-only and remain understandable.** Status, selectedtime, note and resolved date must be shown consistently; refresh and Back must not repeat mutation. **Browser verified:** status cards switched and pending buttons disappeared on processed cards. Student-visible original canceled and new scheduled should agree.

**A-S47.** **As Admin, notification inbox/bell must identify actionable changes and mark only my intended messages read.** Open request notification, click through, mark one/all, check badge and refresh. **Delegated to admin/root tester.** Notification creation for approval/rejection verified directly; live polling/read-state UX requires its own result.

### 1.13. Invoice status, exports, print, sharing and deletion


**A-S48.** **As Admin, I can move an invoice through Draft, Sent, Paid, Overdue and Canceled.** Confirm selected state updates document/list/dashboard/student/parent and paid timestamp only while paid. **Browser verified:** all five buttons exercised for owninvoice3; Paid displayed paid date and switching away removed it. No actual payment provider is involved; “Paid” is manual bookkeeping.

**A-S49.** **As Admin, I need safe business transitions after payment.** Decide whether Paid→Draft/Canceled is legitimate reversal, should require a reason, or should create a credit/adjustment. **Browser verified:** all statuses allowed with one click and no confirmation; that successful mutation is not evidence of an agreed financial-control policy.

**A-S50.** **As Admin, I can filter invoices by Draft/Sent/Paid/Overdue and get matching rows/totals.** **Browser verified failure:** clicking Draft(1) left all3 rows (draft, sent, canceled). Badges are styled as clickable but have no filter handler. Proposed UX: real accessible filter buttons with active state/count or remove pointer styling until implemented.

**A-S51.** **As Admin, I can export invoices to CSV.** **Browser verified:** invoices.csv downloads. Confirm exported rows match declared scope, preserve monetary precision and dates, and do not trigger spreadsheet formulas from malicious names/notes. Full CSV safety is earlier audit scope, not proved by file download.

**A-S52.** **As Admin, I can Print/PDF a clean invoice.** **Browser verified:** Print/PDF button invokes window.print once (instrumented). **Not verified:** actual OS print/PDF save; use print-preview to ensure sidebar/actions hidden, totals/QR visible and multi-page breaks legible. No physical printing occurred.

**A-S53.** **As Admin, I can prepare a WhatsApp share without accidentally sending data.** Button should prepare correct student/invoice/period/amount/status, open intended recipient, and never include auth tokens or private notes. **Not clicked here to avoid real messaging; code traced link only.** A human should inspect the prefilled message and recipient, then cancel. Actual sending needs separate authorization.

**A-S54.** **As Admin, I can delete an invoice only with clear irreversible confirmation and traceability.** **Browser verified:** Delete immediately removed owninvoice3 and returned to list; no confirmation dialog appeared. Other invoices unaffected; owninvoice absent from list. Verify parent/detail404, line cleanup and rebilling eligibility, and decide if deleting paid/issued documents should be forbidden/archived instead.

**A-S55.** **As Admin, I can compare outstanding/revenue across screens.** After generatingRM80 draft, outstanding increasesRM80; Paid reduces outstanding and increases collected revenue; reversal restores expected totals. Check canceled documents excluded and paid dates use agreed local month. **Browser verified:** list showed outstandingRM160 with our RM80 draft plus existingRM80 sent, while canceledRM80 excluded; other transitions' full dashboard ripple remains manual. Never conflate invoice count collection rate with money collection rate without an explicit label.


## 2. Student


### 2.1. Sign in and sign out

**As a Student, I can sign in with the username and password my tutor gave me → my dashboard opens.**

- Prerequisite: an active student record and credentials created by the tutor.
- Try leaving both fields empty → browser asks for username; try a wrong password → inline “Invalid username or password”; enter correct credentials → own dashboard.
- Observed: empty/wrong/correct flows work. Logging in does not change schedule, attendance, invoices, or other students' records.
- I can select **Sign out** → my session is removed and opening a protected student page returns to sign-in. Verification results are recorded in the browser results file.
- I cannot choose another student by changing my dashboard URL: Alice requesting Bob's dashboard is redirected.
- An already-open session may become invalid after signing in on another device because student sessions are single-token in the current implementation. This is a session-policy question, not an assumed multi-device promise.

### 2.2. Dashboard: see what is next

**As a Student, I can see my class totals, upcoming classes, completed classes and hours learned → I know my learning schedule.**

- Prerequisite: tutor has scheduled classes or recorded completion.
- My next class and up to five upcoming entries offer **Join Meeting** when a meeting room exists; **View all** opens My Schedule.
- Observed: dashboard and navigation render; join links point to local meeting routes. No video meeting was opened, so live audio/video/moderator behavior is unverified.
- When the tutor reschedules or cancels, My Schedule and dashboard should agree after reload; a pending reschedule request alone must not move the class.
- Unsupported: student cannot mark attendance, write tutor reports, edit durations/rates, or generate invoices from this screen.

### 2.3. My Schedule: understand every class

**As a Student, I can view my own schedule → I see date/time, subject, duration, location, status, attendance and cancellation reason.**

- Lists the past three months through three months ahead. This is a display window, not proof that older classes do not exist.
- Scheduled entries show **Request Reschedule** and **Join** when meeting room exists; canceled entries do not offer these actions.
- Observed: navigation, scheduled/canceled states and reschedule dialog. Alice cannot navigate to Bob's dashboard, but a separate classroom isolation defect is documented below.
- Follow-on surfaces: tutor calendar/class page, student dashboard, parent schedule. Attendance changes should agree with the tutor and parent after reload.
- Student cannot directly cancel, approve a new time, change attendance or delete a class. Student only requests; tutor decides.

### 2.4. Request a new class time

**As a Student, I can request a reschedule with up to three preferred times and a reason → my tutor receives a pending request.**

1. Open My Schedule, find the class, select **Request Reschedule**.
2. **Cancel** closes without changing the class. Sending an empty required first preference is blocked by browser validation.
3. Enter preferred time 1, optionally times 2/3 and reason; choose **Send Request**.
4. Observed: success toast, request persisted with student/class/preference/reason. The original class stays scheduled until tutor resolves the request.
5. Tutor sees the request in Requests and an admin notification. Student cannot select approval/rejection themselves.

**Important current defects/limits:** submitting another request for the same class is accepted instead of clearly handling the existing pending request. A local datetime preference is stored with server timezone parsing; compare the resulting tutor/parent time carefully. This is an observed workflow risk, not approval to change booking policy.

### 2.5. Receive approval or rejection

**As a Student, I can see my tutor's decision → I know whether my class changed.**

- Approval should mark the original class canceled, create the replacement at the chosen time with the same student/duration/trial semantics, and notify the student. The replacement must show in student dashboard/schedule and parent schedule after reload.
- Rejection should leave the current class unchanged, mark the request rejected, and notify the student with any tutor note.
- Manual cross-role check: keep the student schedule open while the tutor resolves the request; first observe without reload, then reload; distinguish a stale tab from a persistence failure.
- Observed cross-role journey: tutor approved request3; original class4 became canceled and exactly one replacement class6 was scheduled at the selected time for Alice, preserving duration. Student and parent schedules both showed the original/replacement after reload. Tutor rejected duplicate request4; no extra replacement was created, and Alice saw the rejection note. Student notification View opened own schedule. Trial=true preservation was not exercised by this particular normal-class journey.
- Unsupported: student has no request-history management screen or direct withdraw-request button in the current student navigation.

### 2.6. My Class: find learning materials

**As a Student, I can open My Class and expand/collapse topic groups → I can find my tutor's material, assignments and announcements.**

- Prerequisite: tutor creates a post for this student; topics are optional.
- Observed: topic collapse hides its posts; expand restores them; assignment opens from the list.
- Student sees Classwork, not tutor create/edit/delete/grade controls. Due/missing/turned-in/graded labels depend on post and submission state.
- A material or announcement is read-only; attachment links are offered but external files were not opened during this audit.
- **Observed isolation defect:** Alice's own student URL with Bob's post ID displays Bob's private post. The dashboard protection does not protect this nested object. Expected result is not-found/denied, with no foreign content or attachment URLs.

### 2.7. Turn in assignment content

**As a Student, I can open an assignment and turn in my answer → my tutor can review one saved submission.**

1. Tutor creates an assignment for me; open it from My Class.
2. Blank or spaces-only work with no file/link leaves **Turn in** disabled.
3. Enter an answer; choose **Turn in** → success notification and submitted work view.
4. Observed: special characters and a checkmark persisted as text, remained after reload, and one submission row existed for Alice/post1.
5. Tutor should see exactly this content in Student Work. My Class should change from Assigned/Missing to Turned in; grading later should change it to Graded.

**Current defect:** after the first submission, the student UI removes the input form and has no Edit/Resubmit control. Prior agreed policy says latest submission replaces previous, but that workflow cannot be used through the screen.

### 2.8. Attach a file or link

**As a Student, I can attach an image/PDF or add a link → my submitted work includes supporting material.**

- **Attach file** opens a chooser; selected file name/size appears; the small X removes it.
- Observed: a file above 10MB is rejected inline; a small file can be selected and removed.
- Simulated upload failure shows an inline message and leaves no submission row. Simulated upload success stores the returned file URL and shows Link submitted.
- Real Apps Script upload/storage access was not tested; simulated upload success is not evidence that cloud storage credentials work.
- **Observed defect:** `javascript:alert(1)` in the Link field can be turned in and is stored. Only ordinary supported HTTP(S) links should be accepted. No malicious link was executed or opened.

### 2.9. Read tutor feedback and grade

**As a Student, I can reopen a graded assignment → I see my grade, grading date and feedback.**

- Dependency: tutor must grade the same student's submission through their Student Work screen.
- Intended ripple: tutor grade save → submissions grade/feedback/graded_at → student assignment detail and classroom badge; reload existing student tab to check persistence.
- A missing grade should not appear as zero; grade zero should display as an actual grade.
- Observed cross-role grade journey: tutor opened Alice submission1, saved grade7 and “UIAUDIT teacher feedback”; student reopened the assignment and saw the same grade, feedback, grading date and Graded badge after reload. This assignment has no max-points setting, so it displays7 rather than7/10.
- Unsupported: student cannot change their own grade; no dedicated student Grades tab is currently exposed.

### 2.10. Student Notes

**As a Student, I can view my private notes from class meetings → I can revise what I wrote.**

- The Student Notes screen reads only student-scope notes from my classes; teacher-scope notes should never appear.
- Observed: fake Alice student-scope note appears on the notes page.
- Notes are edited from the meeting Notes panel, not this list. No meeting was opened in this suite, so live autosave/failure behavior is not counted as tested here.
- Tutor running notes and private teacher notes are different records; student notes should not overwrite them.

### 2.11. Notifications

**As a Student, I can open Notifications and select Mark all read → my inbox no longer marks those messages new.**

- Prerequisite: schedule/material/assignment/reschedule actions create student-recipient notifications.
- Observed: Alice notification renders; Mark all read persisted read flags and “All caught up” after reload.
- **View** links should take me to the relevant own schedule/classroom page. Other students' messages must remain unread and hidden; direct server notification authorization is audited separately.
- Current screen lists only the latest50; its unread label counts the displayed50 rather than proving there are no older unread rows.
- No email/SMS/WhatsApp is sent by this inbox action.

### 2.12. My Profile and parent link

**As a Student, I can view my personal/guardian information and login details → I know what my tutor has recorded.**

- Observed: profile renders; Copy link writes the latest active parent-share URL to clipboard and changes to Copied.
- The parent link is available only if tutor generated an active share token. Student cannot create or revoke it here.
- I can share the copied URL with a guardian outside this app; the audit copied locally but did not send a message.
- Personal/contact/guardian/credential editing requires contacting the tutor; no student edit-profile/change-password control is exposed.

### 2.13. Mobile student navigation

**As a Student on a phone, I can open the menu and choose a screen → the requested screen loads.**

- Observed at390×844: menu opens and links navigate.
- **Observed usability defect:** the drawer remains open after choosing My Schedule, covering the new page; manually close it to use the page. Screenshots preserve the state.
- No claim is made that all tablet widths/browser engines were covered.


## 3. Parent / guardian



### 3.1. Open the parent dashboard

**As a Parent, I can open my child's private share link without a separate account → I see the child's progress and invoices.**

- Prerequisite: tutor generated an active share token for this child.
- Observed: valid Alice token opens, invalid token gives404. Read-only access does not change student sessions, attendance, invoices or class schedule.
- Treat the URL as a bearer credential: anyone holding it can view that child's shared data. There is no parent password in the current design.
- Dashboard offers View all schedule/invoices. Its Upcoming card is capped at five because it counts the preview; eight scheduled classes may display five. Student's full count can disagree.

### 3.2. Check attendance

**As a Parent, I can select Attendance → I see each class's attendance and overall rate.**

- Observed: sidebar navigation renders the list and summary.
- The parent cannot mark/change attendance; tutor does it. Reload after a tutor correction to verify the same class shows the same status.
- **Current business inconsistency:** parent counts present+late, admin student profile counts present only; completed-but-unmarked classes also use different denominators between parent dashboard and attendance page. Example present+late+absent yields parent67%, admin33%. Policy needs a single agreed definition.

### 3.3. Check schedule and reschedule outcomes

**As a Parent, I can select Schedule → I see upcoming and recent past/canceled classes.**

- Observed: navigation renders scheduled and canceled fake Alice classes.
- Upcoming is not limited to five here; past list is limited to30. A canceled original and approved replacement should both appear with correct statuses after tutor rescheduling.
- Parent cannot submit a reschedule request, cancel directly, join a live meeting, or edit times from this share page. Request workflow belongs to the authenticated student; approval belongs to tutor.
- A dashboard class incorrectly listed as upcoming can move to past on this screen because the two queries use different timestamp representations; see route audit.

### 3.4. Read class reports

**As a Parent, I can select Class Reports → I can read the tutor's topics, homework, performance, strengths, improvement areas, next focus and rating.**

- Dependency: tutor saves a post-class report linked to my child's class.
- **Browser verified:** reports navigation/empty state and follow-up B01: tutor saved topics/homework, and an independent parent session saw that new class report after reload.
- Parent cannot edit the report or private teacher/student meeting notes.
- Policy unresolved: if a reported class is canceled afterward, should the report remain visible as history? Current query retains it.

### 3.5. Understand invoice balance

**As a Parent, I can select Invoices → I see invoice documents, paid totals and outstanding amount.**

- Observed: list navigation and invoice detail link work; the detail is scoped by both invoice ID and the token's student ID.
- **Observed/traced financial defect:** a canceled RM80 invoice is still included in parent Outstanding. With a sent RM80 and canceled RM80, parent shows RM160 while tutor sees RM80. Parent should not be asked for canceled debt.
- Draft invoices are visible to parents too. Decide whether a draft is an internal proposal or already intended to be shared before changing that behavior.
- Parent cannot record payment, mark Paid, cancel/delete invoices, or edit fees. Tutor updates invoice status; reload should reflect the status and amount consistently.

### 3.6. Open, print or save an invoice

**As a Parent, I can open an invoice and select Print / PDF → the browser print flow can produce a copy.**

- Observed: AUDIT-1 detail renders; Print/PDF invokes window.print; print-media screenshot hides navigation. The print call was intercepted, so no physical printer job or system PDF dialog was used.
- Document includes line descriptions/hours/rate/amount/total, bill-to details, payment instructions and optional DuitNow QR. No online payment action is implemented.
- Opening a nonexistent invoice returns404. An invoice belonging to another child must similarly return404.
- Historical identity, currency and payment settings are read live; changing them can change old printed documents. Whether these should be frozen is a business-policy question.

### 3.7. Revoked or invalid share link

**As a Parent whose link is revoked, I can no longer load shared pages → my child's data is protected from an old link.**

- Manual check: tutor revokes/regenerates link; old token should fail dashboard, schedule, attendance, reports and invoice detail after refresh. Already rendered browser text cannot be erased remotely.
- Invalid/nonexistent tokens observed404. Observed with a separate fake token: valid page loaded, token was toggled active→inactive in the isolated DB, refresh returned404. Alice's original token stayed active.
- Parent cannot restore the token or request a new one within this page; contact tutor.

### 3.8. Mobile parent navigation

**As a Parent on a phone, I can open the menu and choose a page → the page loads with my child's data.**

- Observed at390×844: menu opens and invoice link navigates.
- **Observed usability defect:** drawer remains open over destination page until manually closed, same as student navigation.


## 4. Connected business journeys — action → dependencies → acceptance result

### 4.1 Enroll a student → credentials and future operations

**As an Admin, I can add an active student → the roster/profile and login credentials become available.**

Check dashboard count, scheduling/invoice student options and Classroom directory. Sign in as that student; verify only their own data. No lesson, invoice or parent-access token should be created merely by adding a student. Changing the student's name later changes display identity but does not regenerate existing login credentials.

### 4.2 Change a rate → future invoice calculation, not an existing line-price rewrite

**As an Admin, I can change the student's hourly rate → future invoice generation uses that rate.**

Current behavior: an already-created invoice line keeps its stored rate/amount. Unbilled older lessons use the student's current rate when an invoice is first generated; there is no effective-dated rate history. Test80→100: old issued line stays80; a newly invoiced60-minute eligible lesson becomes100. This is an implemented rule to understand, not a user-confirmed historical repricing policy.

### 4.3 Request a new time → pending review only

**As a Student, I can request a reschedule → the Admin receives a pending request and notification.**

Original class remains scheduled. Student dashboard, parent schedule and invoices must not change because the request was sent. The student cannot approve it. Test a second request: current UI accepts multiple pending requests for the same class, a confirmed gap requiring duplicate-handling policy.

### 4.4 Approve → canceled original + one replacement + correct notices

**As an Admin, I can approve a student request → the original is canceled and one replacement is scheduled.**

Check owner, original→replacement relationship, duration/location/subject, chosen MYT time, meeting room and trial classification. Student receives approval; student and parent schedules show canceled original and replacement after reload; original must be excluded from month-end invoicing. Browser approval/reload/notification journey passed for an ordinary lesson. Separate failed cases: duplicate approval creates two replacements; trial flag is lost; naive local-time parsing shifts the time. One happy-path pass does not override these failures.

### 4.5 Reject → schedule unchanged + explanation to student

**As an Admin, I can reject a request with a note → the request is rejected and the student is notified.**

No replacement, no new invoice line, no change to the existing booking. Check student rejection note and View link. This cross-role journey passed. Rejection after an earlier approval currently has no pending-state guard and can misrepresent the already-changed schedule; that alternate path remains a lifecycle defect.

### 4.6 Attend, arrive late, miss or correct a lesson → attendance, reports, billing

**As an Admin, I can record Present/Late/Absent → the class and dependent summaries update.**

Present/late currently sets completed; absent sets canceled. A60-minute completed attended lesson at80/hour bills80; absent must not charge and canceled must be omitted entirely under your rules. Check admin class/student/dashboard, student schedule and parent attendance. Present/late/absent button operations passed, but three attendance-percentage formulas disagree. Correcting canceled→Late currently resurrects completed status; do not mistake this for a settled reinstatement policy.

Business cases: present→late; present→absent; absent→present; unmarked completed; absent before invoicing; tutor cancellation versus student absence; marking a future class. Current status and attendance can also be edited independently, permitting completed+absent—invoice generation wrongly charged that state in an isolated test.

### 4.7 Save a report → parent learning update and pending-report count

**As an Admin, I can save topics, homework and feedback → a parent can read the report for that lesson.**

Check one report per class, admin inline fields, dashboard pending-report list and parent Reports after reload. Browser persistence and parent visibility passed. Saving a report completes a non-canceled class; a canceled class remains canceled. Important alternate case: the quick-report dialog opens with blank fields even when a report exists; browser test failed preservation expectations. Use the prefilled inline form until corrected.

### 4.8 Submit with no work, text only, attachment only, or a failed upload

**As a Student, I can turn in meaningful work → the Admin can review exactly that submission.**

|Business state|Expected consequence|Observed|
|---|---|---|
|No text and no file/link|No submission; remain Assigned/Missing|UI disables Turn in; passed|
|Whitespace only, no attachment|No empty turn-in|UI blocks; passed|
|Text only|One saved submission, tutor sees text, badge Turned in|Browser+DB passed|
|Attachment/link only|Valid supporting work can be turned in without text|Simulated upload/link path passed; real storage unverified|
|File upload fails|No false success and no empty submission; work remains recoverable|Simulated failure passed|
|Submission succeeds but teacher has not graded|Show Turned in, not Graded|Verified in normal journey|
|Student wants to correct submitted work|Expose the previously agreed latest-replaces workflow|Unavailable: no Resubmit/Edit work button|
|Student targets another student's post|Deny and do not read/write foreign work|Failed: foreign content and action scope gaps|

The visual button guard does not prove server-side business validation; direct action invariants are separately audited. Link parsing currently accepts an unsafe javascript scheme through the UI (stored only, never executed during tests).

### 4.9 Return a grade → student gets the same evaluation

**As an Admin, I can grade and comment on a submission → the student sees that score/feedback and Graded state.**

Check admin Student Work and Grades tab, student detail and classroom badge after reload. Real cross-role grade7/feedback journey passed, as did85/100 persistence and admin list consistency. A separate grade999/100 was accepted (failure). Resubmission resets/retains grade only under a policy you approve; current upsert retains the old grade even if work changes.

### 4.10 Month-end invoice → completed billable lessons only, once

**As an Admin, I can invoice a student's month → that student's parent receives a correct document and balance.**

Worked rule:2 attended60-minute lessons atRM80 +1 absence +1 canceled lesson should yieldRM160 and only the two attended lesson lines. A trial remains handled under the existing free-trial policy unless explicitly changed. Check classes included/excluded, rate and duration, line sum=header total, correct MYT period, no other student, no duplicate claim, parent detail/list/print and dashboard balance.

Current failures: canceled lessons appear as zero lines; completed+absent can charge; KL defaults shift the month; end date can display next day; concurrent generation can bill one lesson twice. Ordinary one-class RM80 UI generation passed. A repeat sequential request correctly refused but showed an opaque production error instead of a useful business message.

### 4.11 Mark Paid, Sent, Overdue or Canceled → status and balances

**As an Admin, I can change invoice status → lists, dashboard and parent view should agree.**

Marking Paid is manual bookkeeping, not a payment transaction or proof money reached your account. It sets paid_at; no online payment, partial-payment ledger or refund is provided. Canceled invoices must not count as debt: parent currently still includes them, a reproduced financial failure. No email or WhatsApp is sent merely by choosing Sent; WhatsApp opens a user-controlled compose link when clicked.

### 4.12 Generate or stop recurrence → materialized lessons and retained history

**As an Admin, I can generate a recurring series → individual lessons are created on matching weekdays, skipping known holidays.**

Short Friday series with a holiday passed the date-inclusion test. New recurring rows incorrectly start Present and have no meeting room. Blank end date creates about56days; no background extension exists. Adding a holiday later does not cancel existing bookings. There is no visible stop/edit-series control; the backend-only stop action hard-deletes scheduled history. Your expected future-cancel/history-preserve rule remains a failing/unavailable capability, not a passed UI action.

### 4.13 Withdraw a student or revoke a parent link → access changes without lost history

**As an Admin, I can deactivate a student or revoke a parent link → future access changes while historical business records remain.**

Soft deletion preserves classes/reports/invoices. New student login checks active; old action tokens do not recheck active/expiry correctly. Parent revocation successfully returns404 after reload. Deactivation does not currently revoke parent links or automatically cancel future lessons; that withdrawal policy needs an explicit decision. Other students' sessions and parent links must remain intact.

### 4.14 Edit/delete source data → check downstream documents before confirming

**As an Admin, I can edit/delete lessons, posts, notes and invoices → only the intended dependent records change.**

Deleting a class can cascade report/private-note/request rows while stored invoice amounts remain; deleting a post can cascade submissions/questions/files metadata; deleting a topic moves posts to No topic; deleting an invoice frees lessons to be invoiced again. This is why Delete must not be confused with Cancel, and why child records/history need a confirmation summary. Your normal invoice process is month-end; no new credit-note/adjustment policy is assumed here.

## 5. Important capability gaps and decisions

- No direct student/parent cancellation, parent reschedule form, student invoice payment, online payment/refund ledger, student password-change UI, ordinary quiz authoring/answer journey, admin post-file uploader, or recurring-series management screen.
- Latest submission replacement is recorded policy but not reachable in student UI.
- Reminder permission control does not implement scheduled reminders.
- Decide consistent attendance denominator, archive access, regrading rules, overlap policy, draft invoice visibility, holiday changes, notification rules and rescheduled-trial pricing before implementing ambiguous changes. Existing [audit questions](../.audit/runs/2026-11-12/questions.md) remain a separate decision ledger; already answered absence/month-end/recurrence rules are not being asked again.

## 6. Evidence, limits, performance and redesign

See [business walkthrough results](../.audit/runs/2026-11-13-walkthrough/REPORT.md) for actual successes, failures, pending checks and source references. This is a complete catalog of discovered user-facing capabilities and important business branches, not an assertion that all theoretical combinations have passed. External video/file delivery, full browser/device combinations, conflict rules and every destructive/failure-injection path remain explicitly unrun.

See [performance investigation](../.audit/runs/2026-11-13-walkthrough/PERFORMANCE.md). Local instrumentation confirms costly cold-worker migration initialization and repeated database calls. Public production login/redirect timing was measured read-only; authenticated production action latency was not measured. Do not treat local SQLite timings as Turso/Vercel timings.

A [visual redesign proposal](../.audit/runs/2026-11-13-walkthrough/ui-redesign-proposal.html) follows your journal app's slate/white cards, rose accents, warm orange detail, rounded inputs and responsive44px controls. It is a sample-data prototype, not an installed production redesign. Role switches in the prototype are preview controls, not app permission switching.

Use [the CSV test worksheet](BUSINESS-USE-CASE-WORKSHEET.csv) to record your own results per case. Application code, dependencies and production deployment remain unchanged.
