# TuitionHub — Current User Capabilities and Business Test Guide

Updated14November2026 after the approved implementation. Earlier audit observations are preserved under `.audit/runs`; this document describes the current local code, not the unchanged live deployment.

## How to use this guide

Each numbered case is **As a role I can action → result**, followed by dependencies and a manual check. Use separate Admin, Student and Parent sessions. Check the acting page, then the affected other-role pages, reload for persistence and confirm unrelated students remain unchanged. Record your own results in [the worksheet](BUSINESS-USE-CASE-WORKSHEET.csv). “Browser verified” means actual isolated local browser checks; module regressions explicitly stub request/UI boundaries. External video, real file delivery, printers and WhatsApp sending were not exercised live.

## Agreed rules

- Present = attended; Absent = last-minute cancellation/no-show; Cancelled = advance notice and may reschedule. No Late option. Rate = Present/(Present+Absent), ignoring Cancelled and unmarked/future lessons.
- Absences are free. Canceled lessons do not appear on invoices. A rescheduled replacement is included once marked Present, at its normal or preserved free-trial rate.
- Invoice lines show date, time and duration, without subject. Revenue belongs to the billed lesson month even when paid later; Revenue=Paid+Outstanding, excluding canceled invoices.
- Assignment work is versioned. Only latest can be graded; older work and evaluations remain read-only history. New work awaits a new grade.
- Lessons cannot overlap across students for the single tutor. Drag/resize requires confirmation. Recurrence defaults through31December of its start year; stop cancels future lessons and preserves history.
- Every relevant student change creates an in-app update, including post edits; unread numeric circles update as messages arrive/read. Holidays and browser reminder features are removed.
- Deactivation removes student access immediately while records remain. Parent link revocation is a separate action.

## Role boundaries

Admin manages the business. Students use their own schedule/classwork/notes/inbox/profile and request new times; they do not directly cancel or approve lessons. Parents have a read-only bearer-link view of their child’s schedule/attendance/reports/invoices, without a separate account or classwork submission interface. There is no online payment/refund ledger, background push reminder or quiz authoring interface.

## 1. Admin

### 1.1. Access and navigation

#### 1.1.1. As an Admin, I can sign in and navigate my workspace → my management pages open only with a real current admin session.

**Reflects in:** Admin session; sidebar; dashboard.

**Manual check:** Sign in, reload, sign out; another admin session stays independent. A forged cookie cannot expose records.

**Evidence:** Browser verified with isolated fake data.

#### 1.1.2. As an Admin, I can collapse the sidebar or use the mobile menu → the preference persists and the mobile menu closes when I choose a destination.

**Reflects in:** Browser preference; destination route.

**Manual check:** At390px open menu, choose Invoices; verify menu closes and controls fit.

**Evidence:** Browser verified with isolated fake data.

### 1.2. Dashboard

#### 1.2.1. As an Admin, I can review this month, upcoming lessons, attendance and finances → cards use the same Malaysia-time periods and billing-month totals as their detail pages.

**Reflects in:** Classes; attendance; invoices; Financial History.

**Manual check:** Compare each summary with the rows it links to; future months do not inflate this month.

**Evidence:** Browser verified with isolated fake data.

### 1.3. Students and profiles

#### 1.3.1. As an Admin, I can add a student → an active roster/profile record and portal credentials are created.

**Reflects in:** Roster counts; classroom directory; scheduling/invoice pickers; student login.

**Manual check:** New student can sign in; no lesson or invoice appears merely from enrollment.

**Evidence:** Browser verified with isolated fake data.

#### 1.3.2. As an Admin, I can edit profile, contact, rate or active status → current identity/settings update, and future first-time invoice calculation uses the current rate.

**Reflects in:** Admin/student/parent identity; future invoice generation; profile notification.

**Manual check:** Reload other role views. Existing invoice line amounts remain snapshots. Name edits do not silently change credentials.

**Evidence:** Browser verified with isolated fake data.

#### 1.3.3. As an Admin, I can deactivate a student → student access ends immediately while historical lessons, work, reports and invoices remain.

**Reflects in:** Server sessions; active lists; historical records.

**Manual check:** Try old student session and a new login: both denied. No historical records disappear.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.3.4. As an Admin, I can copy login instructions → the intended student portal link and credentials are copied for manual sharing.

**Reflects in:** Clipboard only.

**Manual check:** Paste locally and verify correct student; blocked clipboard gives an error. No message sends automatically.

**Evidence:** Browser verified with isolated fake data.

#### 1.3.5. As an Admin, I can export the roster → a safe CSV downloads without changing the roster.

**Reflects in:** CSV; roster data.

**Manual check:** Compare rows, quoting and safe spreadsheet text; export action rejects other roles.

**Evidence:** Browser verified with isolated fake data.

### 1.4. Student notes and parent links

#### 1.4.1. As an Admin, I can add, search, expand or delete an administrative note → the intended profile timeline changes, independent of class reports and meeting notes.

**Reflects in:** student_notes; profile list/count.

**Manual check:** Reload; search and clear filter; delete only own selected note. Other note types and students stay unchanged.

**Evidence:** Browser verified with isolated fake data.

#### 1.4.2. As an Admin, I can generate or copy a parent link → a guardian can read only the linked student’s shared data.

**Reflects in:** Active share token; parent dashboard/schedule/reports/invoices.

**Manual check:** Open in independent parent session; credentials/private teacher notes are absent.

**Evidence:** Browser verified with isolated fake data.

#### 1.4.3. As an Admin, I can revoke or replace a parent link → the old link stops granting new access while historical business records remain.

**Reflects in:** Share tokens; every parent page.

**Manual check:** Refresh old link and invoice detail:404. Another student’s parent link still works.

**Evidence:** Browser verified with isolated fake data.

### 1.5. Schedule and lesson details

#### 1.5.1. As an Admin, I can create a one-off lesson → one scheduled, unmarked lesson with a meeting room is saved at the entered MYT time.

**Reflects in:** All role schedules; upcoming counts; student notification.

**Manual check:** Enter10:00MYT; it displays10:00 everywhere. Another student’s overlapping booking is rejected.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.5.2. As an Admin, I can switch Month/Week/Day/5days/Agenda and move through dates → the selected range loads the corresponding lesson records without moving them.

**Reflects in:** Calendar range URL/data; no business writes.

**Manual check:** Navigate beyond the initial month; compare the same lesson’s time in each view.

**Evidence:** Browser verified with isolated fake data.

#### 1.5.3. As an Admin, I can click a day or select a time range → the lesson planner uses that proposed date/time and offers 1 hour, 1.5 hours or 2 hours.

**Reflects in:** Create dialog; class write only on save.

**Manual check:** Cancel leaves no record; save once creates exactly one lesson.

**Evidence:** Browser verified with isolated fake data.

#### 1.5.4. As an Admin, I can drag or resize a scheduled lesson → a proposed time/duration is confirmed before the authorized change is saved.

**Reflects in:** Class time/duration; overlap validation; all schedules; student notice.

**Manual check:** Keep original leaves DB unchanged; Confirm updates it; a conflict rejects without changing other lessons.

**Evidence:** Browser verified with isolated fake data.

#### 1.5.5. As an Admin, I can open/edit a lesson → the correct student, schedule, duration, state, room and private notes appear.

**Reflects in:** Class detail; calendar; student/parent views; future billing inputs.

**Manual check:** Change one field, reload related views, and ensure state/attendance remain valid. Completed/canceled lessons cannot be dragged.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

### 1.6. Attendance and class reports

#### 1.6.1. As an Admin, I can mark Present → the held lesson becomes completed and attended.

**Reflects in:** Attendance lists/rate; teaching hours; pending report; billable lesson; student notice.

**Manual check:** A60-minute attended lesson atRM80/hour becomes eligible forRM80 once, unless a free trial.

**Evidence:** Browser verified with isolated fake data.

#### 1.6.2. As an Admin, I can mark Absent → a last-minute cancellation/no-show is recorded, completed as missed, and never charged.

**Reflects in:** Attendance denominator; student/parent status; invoice exclusion; student notice.

**Manual check:** Absent appears as Absent, affects attendance rate, and creates no invoice line.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.6.3. As an Admin, I can correct Present/Absent attendance → the recorded result and relevant summaries agree after reload.

**Reflects in:** Attendance and dashboards; student notification.

**Manual check:** Present↔Absent is reflected across roles. Advance-canceled lessons cannot be silently resurrected by marking attendance.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.6.4. As an Admin, I can save or update a class report → one report persists and its parent-visible topics/homework/feedback update.

**Reflects in:** Class report; completion; pending-report count; parent expandable table.

**Manual check:** Inline and quick edit prefill existing content. Edit one field; unchanged report fields survive.

**Evidence:** Browser verified with isolated fake data.

#### 1.6.5. As an Admin, I can review attendance percentage → Present divided by Present+Absent is shown consistently.

**Reflects in:** Admin profile/dashboard; parent dashboard/attendance.

**Manual check:** 3Present+1Absent+1Cancelled =75%; unmarked/future/canceled excluded. No Late option.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

### 1.7. Cancel and reschedule

#### 1.7.1. As an Admin, I can cancel a lesson in advance → the original stays in history as Cancelled, unmarked, free and reschedulable.

**Reflects in:** All schedules; notifications; invoice exclusion.

**Manual check:** Cancel is clearly labeled, not confused with permanent deletion; no canceled line appears in invoice.

**Evidence:** Browser verified with isolated fake data.

#### 1.7.2. As an Admin, I can reschedule an advance-canceled/scheduled lesson → one linked replacement is scheduled; original remains canceled.

**Reflects in:** Owner/duration/location/trial; room; schedules; notifications.

**Manual check:** Replacement retains free trial status. Mark replacement Present later and invoice it once; original never charges.

**Evidence:** Browser verified with isolated fake data.

### 1.8. Recurring series

#### 1.8.1. As an Admin, I can create a recurring series without an end date → lessons generate from the start date through31December of that start year.

**Reflects in:** Individual class rows; schedule; generated-through date; student notice.

**Manual check:** Matching weekdays only, correct MYT times, unique rooms, unmarked attendance, no duplicates and no overlap.

**Evidence:** Browser verified with isolated fake data.

#### 1.8.2. As an Admin, I can choose weekdays, weekly/biweekly/custom interval and an earlier end date → the finite chosen pattern is generated only within its allowed range.

**Reflects in:** Series rules and materialized lessons.

**Manual check:** Check first/last date by hand; invalid/nonpositive interval is rejected before generating rows.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.8.3. As an Admin, I can open Manage series and stop future lessons → future scheduled rows become Cancelled; past/history and series remain readable.

**Reflects in:** Class/series state; all schedules; notification.

**Manual check:** Confirm stop; row count/history retained and future bookings no longer block time slots.

**Evidence:** Browser verified with isolated fake data.

#### 1.8.4. As an Admin, I can extend a series through the following year → additional lessons generate through the displayed next December31.

**Reflects in:** Series horizon; new classes; overlap checks; student notice.

**Manual check:** Existing lessons are not duplicated; canceled/stopped series is not silently restarted.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

### 1.9. Invoices

#### 1.9.1. As an Admin, I can generate a month-end invoice → unbilled attended completed lessons become invoice lines in an atomic operation.

**Reflects in:** Invoice header/items; class billing claims; parent documents/balance; revenue.

**Manual check:** Canceled/absent omitted. Date/time/duration only, no subject; lines sum to total; concurrent generation cannot double-bill.

**Evidence:** Browser verified with isolated fake data.

#### 1.9.2. As an Admin, I can invoice a rescheduled attended lesson → the replacement appears once at its normal or preserved trial rate.

**Reflects in:** Replacement state; invoice items; parent invoice.

**Manual check:** Approve/move replacement → Present → generate correct month. Original canceled lesson does not appear.

**Evidence:** Browser verified with isolated fake data.

#### 1.9.3. As an Admin, I can choose an invoice period → correct local calendar dates select the intended billing month(s).

**Reflects in:** Invoice period and lessons; billing_month.

**Manual check:** November defaults1–30Nov. End before start shows a useful message; empty/already-billed selection does not create empty/duplicate documents.

**Evidence:** Browser verified with isolated fake data.

#### 1.9.4. As an Admin, I can filter and inspect invoices → the chosen status is applied and the right student/document opens.

**Reflects in:** Invoice list; student links; details.

**Manual check:** Paid filter excludes drafts; clear filters restores all. Canceled invoice history is retained.

**Evidence:** Browser verified with isolated fake data.

#### 1.9.5. As an Admin, I can mark an invoice Draft/Sent/Paid/Overdue/Cancelled → manual bookkeeping status and related balances update consistently.

**Reflects in:** Dashboard; Financial History; parent status/debt; notification.

**Manual check:** Paid is not an online transfer. Canceled invoice contributes neither revenue nor outstanding; October stays October even paid inNovember.

**Evidence:** Browser verified with isolated fake data.

#### 1.9.6. As an Admin, I can cancel an invoice document → it remains as canceled history and is removed from active amounts owed.

**Reflects in:** Financial history; parent/admin outstanding.

**Manual check:** Confirm cancellation; history stays. Do not treat cancellation as deleting/rebilling historical lines.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.9.7. As an Admin, I can print/save PDF, export CSV or compose a WhatsApp message → a copy/download/compose action occurs without changing payment status.

**Reflects in:** Browser print; CSV; user-controlled external compose.

**Manual check:** Print invokes browser function; actual printer/WhatsApp sending is external and was not executed.

**Evidence:** Browser verified with isolated fake data.

### 1.10. Financial History

#### 1.10.1. As an Admin, I can review all financial history and monthly bar/trend charts → revenue is allocated to invoice billing month, with Paid and Outstanding separated.

**Reflects in:** All invoices; dashboard/monthly summary; status changes.

**Manual check:** RM1000 billed inOctober = October revenue, whetherRM700 paid then or later; canceled excluded.

**Evidence:** Browser verified with isolated fake data.

#### 1.10.2. As an Admin, I can filter by student, status and month range → summary, chart and table use the same selected invoices.

**Reflects in:** Monthly aggregates and invoice history.

**Manual check:** Compare selected table rows against cards/charts; zero intervening months remain visible in a time series.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

### 1.11. Classroom and topics

#### 1.11.1. As an Admin, I can open one student’s classroom and create/rename/delete topics → classwork organization updates without deleting submitted work.

**Reflects in:** Admin/student topic groups and post choices.

**Manual check:** Deleting a topic moves its posts to No topic; other student’s topics/work remain unchanged.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.11.2. As an Admin, I can create a topic inside an open post dialog → the new topic becomes immediately selectable/selected.

**Reflects in:** Topic record and final post.topic_id.

**Manual check:** Post under the new topic without closing/reopening; student sees the same grouping.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

#### 1.11.3. As an Admin, I can post material, assignment or announcement → the intended student sees it and receives a scoped notification.

**Reflects in:** Posts; topic group; student inbox; assignment state.

**Manual check:** No other student can open or submit to the post. Quiz authoring is not a current screen.

**Evidence:** Browser verified with isolated fake data.

#### 1.11.4. As an Admin, I can edit a posted item → the same post updates and its student is notified of meaningful changes.

**Reflects in:** Instructions/due/points/topic; student list/detail/inbox.

**Manual check:** Reload student view; no-op save does not spam duplicate notices; existing attempts remain preserved.

**Evidence:** Browser verified with isolated fake data.

#### 1.11.5. As an Admin, I can delete a post with confirmation → the intended content and dependent classroom data are removed.

**Reflects in:** Post, attachments/submissions/questions per FK; student list; notification.

**Manual check:** Review destructive scope before confirming; cancel leaves it intact. Financial invoices are unrelated.

**Evidence:** Implemented; live integration/manual check remains.

### 1.12. Submission grading and history

#### 1.12.1. As an Admin, I can open Student Work for an assignment → the latest attempt and expandable earlier work/feedback appear.

**Reflects in:** Current submission projection; immutable attempt lineage.

**Manual check:** Only one current grade form is exposed, not a grade form on every historic version.

**Evidence:** Browser verified with isolated fake data.

#### 1.12.2. As an Admin, I can grade the latest submission and return feedback → the latest grade becomes the current result across classwork/Grades/student views.

**Reflects in:** Current projection and matching version; student notification.

**Manual check:** Grade0..max only;999/100 rejected. Older attempts keep their work/grades and are read-only.

**Evidence:** Browser verified with isolated fake data.

#### 1.12.3. As an Admin, I can try grading an old open form after a student resubmits → the stale save is rejected with a reload message.

**Reflects in:** Expected version; new attempt integrity.

**Manual check:** New work remains ungraded until evaluated; old form cannot accidentally grade newer content.

**Evidence:** Browser verified with isolated fake data.

### 1.13. Reschedule Requests

#### 1.13.1. As an Admin, I can review a pending student request → preferences/reason appear while the original lesson stays scheduled.

**Reflects in:** Request row; admin inbox; original class.

**Manual check:** Sending a request alone changes no schedule/invoice; duplicate pending requests are blocked.

**Evidence:** Browser verified with isolated fake data.

#### 1.13.2. As an Admin, I can approve one preferred time → original canceled and exactly one replacement created, followed by notification.

**Reflects in:** Request resolution; owner/trial/duration; all role schedules.

**Manual check:** Replayed approval/rejection cannot create another replacement or contradict the resolved state.

**Evidence:** Browser verified with isolated fake data.

#### 1.13.3. As an Admin, I can reject a request with a note → student receives the explanation and original booking is unchanged.

**Reflects in:** Request state; student inbox; schedule.

**Manual check:** No replacement/charge created. Other requests/students unaffected.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

### 1.14. Notifications

#### 1.14.1. As an Admin, I can view or mark messages read → the true circular unread count updates when messages arrive/read.

**Reflects in:** Scoped inbox; bell/menu; all-unread aggregate.

**Manual check:** Count is not limited to displayed50; opening a notification marks it read; forged/other-role calls denied.

**Evidence:** Browser verified with isolated fake data.

### 1.15. Settings

#### 1.15.1. As an Admin, I can save business name/contact/currency/payment instructions → branding/labels/instructions update where used.

**Reflects in:** Admin/parent invoice and business views.

**Manual check:** Settings are live labels, not currency conversion. Existing line amounts remain fixed.

**Evidence:** Browser verified with isolated fake data.

#### 1.15.2. As an Admin, I can upload or remove a DuitNow QR image → invoice presentation changes; payment state does not.

**Reflects in:** QR setting; invoice and print views.

**Manual check:** Image limit500KB matches UI; failure keeps previous data. No holiday or browser reminder controls remain.

**Evidence:** Implemented; live integration/manual check remains.

### 1.16. Meeting and private notes

#### 1.16.1. As an Admin, I can join an authorized class and save private teacher notes → correct room is used and scoped notes persist safely.

**Reflects in:** Meeting owner/session; private class_notes; draft/save queue.

**Manual check:** Save latest text before leaving; old acknowledgment cannot mark new edits saved. Live video provider verification is separate.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

## 2. Student

### 2.1. Sign in and dashboard

#### 2.1.1. As a Student, I can sign in with my tutor-issued account → only my active, unexpired session can read my pages.

**Reflects in:** Student session; own profile and dashboard.

**Manual check:** Changing URL to another student/post does not expose their data; deactivation removes access.

**Evidence:** Browser verified with isolated fake data.

#### 2.1.2. As a Student, I can view upcoming lessons and completed learning → my counts and times agree with My Schedule and parent view.

**Reflects in:** Own classes; latest preview versus full count.

**Manual check:** Preview shows first entries but total reflects full set; canceled is distinct from absent.

**Evidence:** Browser verified with isolated fake data.

### 2.2. My Schedule

#### 2.2.1. As a Student, I can see my full history and confirmed future lessons → all generated-year lessons are listed in Malaysia time.

**Reflects in:** My dashboard; tutor calendar; parent schedule.

**Manual check:** Canceled originals and replacements retain clear state; no direct student cancellation button exists.

**Evidence:** Browser verified with isolated fake data.

#### 2.2.2. As a Student, I can request a new time with preferences and reason → my tutor gets a pending request; existing booking remains.

**Reflects in:** Pending request; admin notification.

**Manual check:** Cancel dialog makes no request. I cannot request for another student or duplicate a pending request.

**Evidence:** Browser verified with isolated fake data.

#### 2.2.3. As a Student, I can receive approval or rejection → my inbox explains the outcome and schedules reflect the decision.

**Reflects in:** Request resolution; canceled original/replacement or unchanged original.

**Manual check:** View link opens my own schedule; rejection note visible. Reload parent view and compare.

**Evidence:** Browser verified with isolated fake data.

### 2.3. My Class

#### 2.3.1. As a Student, I can open materials, assignments and announcements by topic → I read only items assigned to me.

**Reflects in:** Posts/topics/attachments; inbox links.

**Manual check:** Tutor edits appear after reload and notify me. Parent portal does not expose my assignment workspace.

**Evidence:** Browser verified with isolated fake data.

### 2.4. Assignments

#### 2.4.1. As a Student, I can turn in text or an attachment/link → one meaningful new attempt is recorded and the tutor can review it.

**Reflects in:** Current submission; history; classwork state; tutor notification.

**Manual check:** Blank/whitespace alone cannot turn in. Only supported4MB image/PDF or safe HTTPS link; failed upload does not create false submission.

**Evidence:** Browser verified with isolated fake data.

#### 2.4.2. As a Student, I can submit a newer attempt → a new version awaits grading, with previous work/grades retained below.

**Reflects in:** Version history and latest state; tutor inbox.

**Manual check:** Third attempt does not erase first/second. Old attempts are not open for grading.

**Evidence:** Browser verified with isolated fake data.

#### 2.4.3. As a Student, I can read a returned grade and feedback → the latest evaluated attempt’s result matches the tutor’s view.

**Reflects in:** Latest grade; Grades/classwork status; graded date.

**Manual check:** After resubmission current work shows Awaiting grading, not an inherited grade; expand earlier attempts to see their evaluations.

**Evidence:** Browser verified with isolated fake data.

### 2.5. Private class notes

#### 2.5.1. As a Student, I can write meeting notes and review them later → only my student-scope notes appear in Student Notes.

**Reflects in:** Owned class and scoped note record.

**Manual check:** Teacher private notes never appear here; draft recovery and save-before-leave protect recent typing.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

### 2.6. Notifications

#### 2.6.1. As a Student, I can open updates or mark messages read → the numeric unread circle reflects actual unseen messages.

**Reflects in:** Only my inbox; related schedule/classwork view.

**Manual check:** My read action cannot clear another student/admin inbox; new relevant edits/grades/schedule changes inform me.

**Evidence:** Browser verified with isolated fake data.

### 2.7. My Profile

#### 2.7.1. As a Student, I can review my details and copy an active parent link → my guardian can access the read-only shared view if tutor has enabled it.

**Reflects in:** Own profile; active bearer link; clipboard.

**Manual check:** I cannot create/revoke a parent token or edit my grade/rate from profile.

**Evidence:** Browser verified with isolated fake data.

### 2.8. Access and mobile navigation

#### 2.8.1. As a Student, I can sign out or use the phone menu → session ends or chosen own page opens with the menu closed.

**Reflects in:** Cookie/session; own route.

**Manual check:** Opening protected page after logout returns to login; phone content fits390px.

**Evidence:** Browser verified with isolated fake data.

## 3. Parent

### 3.1. Shared dashboard and access

#### 3.1.1. As a Parent, I can open my child’s active share link → I receive read-only access to that child’s shared information.

**Reflects in:** Scoped bearer token; dashboard and child records.

**Manual check:** Invalid/revoked token denies every shared page; another invoice ID cannot bypass child ownership.

**Evidence:** Browser verified with isolated fake data.

#### 3.1.2. As a Parent, I can review upcoming lessons, attendance and balance → cards agree with detail pages and use full counts.

**Reflects in:** Classes; Present/Absent denominator; active invoices.

**Manual check:** 3Present+1Absent+1Cancelled=75%; upcoming count is not capped by the preview length.

**Evidence:** Automated real-module/SQLite regression; UI details also implemented.

### 3.2. Schedule and attendance

#### 3.2.1. As a Parent, I can view lesson dates, attendance and reschedule history → I see canceled originals and confirmed replacements after tutor actions.

**Reflects in:** Tutor/student schedules; attendance rate.

**Manual check:** I cannot cancel/reschedule or mark attendance; a pending request alone changes nothing.

**Evidence:** Browser verified with isolated fake data.

### 3.3. Class reports

#### 3.3.1. As a Parent, I can scan the compact report table and expand one row → only the selected report’s detail opens.

**Reflects in:** Class report; date/duration/rating; tutor update.

**Manual check:** Reports begin collapsed; expand/collapse using pointer or keyboard. Private notes/assignment submissions stay outside parent view.

**Evidence:** Browser verified with isolated fake data.

### 3.4. Invoices

#### 3.4.1. As a Parent, I can review invoices and outstanding amount → only my child’s documents and active debt are shown.

**Reflects in:** Invoice status; Paid/Outstanding; billing month.

**Manual check:** Canceled invoice documents can remain in history but never count as debt; canceled/absent lessons are omitted from generated lines.

**Evidence:** Browser verified with isolated fake data.

#### 3.4.2. As a Parent, I can open, print or save an invoice → a readable document shows lesson date/time/duration, amounts, status and payment instructions.

**Reflects in:** Scoped invoice items; browser print/PDF; optional QR.

**Manual check:** No subject in new lines; print invokes browser. Viewing/paying outside app does not automatically mark Paid.

**Evidence:** Browser verified with isolated fake data.

### 3.5. Mobile navigation and revocation

#### 3.5.1. As a Parent, I can choose another page on my phone or reopen a revoked link → menu closes on navigation; revoked link fails on refresh.

**Reflects in:** Scoped token and current route.

**Manual check:** Invoice/schedule/reports remain readable on390px without another family’s data.

**Evidence:** Browser verified with isolated fake data.

## 4. Connected journey checklist

1. **Enroll → sign in:** tutor creates student; current profile/credentials work; no lesson/invoice is created automatically.
2. **Request → approve:** student asks new time; original stays scheduled until tutor decision; approval cancels original and creates one replacement; student and parent schedules agree.
3. **Request → reject:** request ends with explanation; no replacement and no booking/invoice change.
4. **Present/Absent/Cancelled → rate/billing:** all views agree; absent/canceled never charge; replacement bills only once attended.
5. **Turn in → grade → resubmit:** blank work blocked; meaningful work visible to tutor; grade visible to student; newer attempt awaits its own grade; previous attempts remain readable and ungradable.
6. **Edit post → notify:** student sees update and an unread notification; opening it updates the badge; no-op edit does not duplicate messages.
7. **Report → parent:** tutor saves; parent table reflects date/duration/rating and expands topics/homework for that lesson only.
8. **Month end → revenue:** eligible lines sum to invoice; billing month never shifts with payment date; admin and parent debt exclude canceled invoices.
9. **Recurring → stop:** lessons reach year-end with rooms/unmarked attendance; stop retains their rows and cancels future scheduled ones.
10. **Drag/resize → confirm:** reject proposal leaves original intact; confirm persists; tutor conflict rejects safely.
11. **Deactivate/revoke:** old student session loses access; revoked parent URL fails after reload; historical records stay.
12. **Slow connection/failure:** buttons show pending and prevent duplicate submission; useful errors retain work, and no partial invoice/reschedule is committed.

## 5. Verification and deployment status

The implementation report and final evidence are in [the repair report](../.audit/runs/2026-11-14-implementation/REPORT.md). Automated checks, true browser flows and unrun external/device cases are distinguished there. Production performance improvement is not claimed until the reviewed code is deployed and measured against the actual Vercel/Turso setup. No push or deployment was performed in this work.

The November 16 visual overhaul supersedes the earlier purple styling. See the [Studio redesign review and screenshots](../.audit/runs/2026-11-16-studio-redesign/REVIEW.md). Business policies and the use-case checklist remain applicable.

The latest [bright red/orange classroom revision](../.audit/runs/2026-11-16-bright-classroom/REVIEW.md) supersedes the earlier Studio colours. Classrooms now open to Stream; Classwork contains topic filters and Create, and Grades/My grades shows current results. The history and latest-version grading rules are unchanged.

The [composer and popup review](../.audit/runs/2026-11-16-composer-review/REPORT.md) records the rebuilt forms and actual pointer/date/time tests. New lesson and recurring planners omit Subject and Location and offer only 1 hour / 1.5 hours / 2 hours. Lesson colours are Scheduled blue, Absent red and Cancelled grey (Present remains green).
