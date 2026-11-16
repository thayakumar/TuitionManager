# Route audit — 2026-11-12

Scope: every app/ file except app/api/upload/route.ts. **All 43 assigned app files read in full (6,667 lines)**. Also read middleware.ts, lib/format.ts, prior .audit/decisions.json and relevant action excerpts. No source edits or remote operations. Static findings below are **Traced** unless upgraded by parent execution. Parent ran HTTP and Playwright on isolated DB: R1 and R2 are **Executed**; evidence `/workspace/scratch/audit-2026-11-12/browser-results.json`. Prior business decisions respected: plaintext credentials and firstName123 accepted; resubmission should upsert; student deletion should preserve history via active=0.

## Findings, prioritized

### R1 — Blocker — forged admin cookie exposes private admin pages and credentials
Evidence: middleware.ts:45-51 tests only whether `admin_session` exists. All admin routes except /schedule lack a call to verifyAdminSession/isAdminRequest/requireAdmin. app/students/[id]/page.tsx:60-64 queries arbitrary student; :281-299 renders username/password and sends them to CopyLoginButton. app/classes/[id]/page.tsx:55-68 queries arbitrary class, student and teacher note; :231-246 renders the note labelled never shown to students. app/layout.tsx:33-45 wraps pages in client navigation/layout only, not authenticated server guard. app/schedule/page.tsx:18 demonstrates correct explicit verification. lib/auth.ts holds actual session check but pages do not invoke it.
Scenario: no login, set Cookie admin_session=anything, GET /students/1. Cookie passes middleware, page queries and renders student's phone, email, guardian details, password and teacher notes. Same attack to /classroom/1/post/1 yields submitted work and feedback; /invoices exposes all families' balances; /requests and /notifications disclose private messages. Actions' requireAdmin checks do not secure GET data reads. Privacy isolation invariant fails. Suggested mechanical fix: server admin route-group layout validating session before returning content (or a guard in each admin page); do not guard public login/share/student pages with admin guard. Test missing, forged, expired and student cookies against every admin route. Severity independent of prior accepted plaintext-password decision; the new issue is unauthenticated access.

### R2 — Blocker — student can read another student's classroom post and attachments
Evidence: app/portal/student/[studentId]/layout.tsx:18-21 validates only URL studentId matches session. app/portal/student/[studentId]/classroom/post/[postId]/page.tsx:35-45 fetches active URL student separately from post `WHERE id = ?`, never checks post.student_id. :47-55 loads attachments by foreign postId and submissions for own student. :82 and :112-118 render title/body/attachments. Contrast listing only own posts in classroom/page.tsx:24-28.
Scenario: Alice session for id 1 requests /portal/student/1/classroom/post/20 where post 20 belongs to Bob id 2. Own-ID layout passes; Bob's title, body, files, due date and points are displayed. Bob's submissions are not directly selected, but material/assignment confidentiality fails. Suggested fix: constrain post WHERE id=? AND student_id=? and notFound before related queries, also constrain admin nested route for consistency (admin does not require isolation but currently breadcrumbs/edit buttons can refer to wrong student). Regression: two students, distinct post/file sentinel strings, cross-ID must 404.

### R3 — Critical — canceled invoice remains outstanding to parent
Evidence: app/share/[token]/invoices/page.tsx:26-35 retrieves all invoices, totalInvoiced=sum(all), totalPaid=sum(paid), outstanding=totalInvoiced-totalPaid. Admin app/invoices/page.tsx:73-75 explicitly excludes status canceled; app/page.tsx:75 outstanding only draft/sent/overdue. Parent summary at share invoices:80-83 displays the incorrect debt.
Scenario: one sent RM80 invoice and one canceled RM80 invoice; parent outstanding RM160, admin RM80. Change sent invoice to canceled: admin outstanding drops RM80, parent does not change. Wrong financial claim visible to customer. Fix: shared outstanding predicate/aggregation, exclude canceled; decide separately whether Total Invoiced means issued noncanceled or every generated document.

### R4 — High — attendance rate disagrees across admin and parent, with third denominator on parent attendance
Evidence: app/students/[id]/page.tsx:126-143 computes present only / completed rows with non-null attendance. app/share/[token]/page.tsx:35-51 computes (present+late)/all completed. app/share/[token]/attendance/page.tsx:29-41 computes (present+late)/(present+late+absent), excluding unmarked completed rows. UI calls each Attendance/Attendance Rate/Rate without disclosing differing definitions.
Scenario A: completed present, late, absent -> admin 33%, parent dashboard/attendance 67%. Scenario B adds completed/null -> admin still33%, parent dashboard50%, parent attendance67%. updateClass explicitly offers completed with attendance blank (classes/[id]/page.tsx:425-451), so this state is supported. Question: whether late counts as attendance; whether unmarked completed classes excluded vs count absent. Recommended shared explicit formula (late included; unmarked excluded with separate pending count), but user decision required.

### R5 — High — Classes This Month includes all future months; monthly time predicates lack shared timezone
Evidence: app/page.tsx:76 COUNT WHERE scheduled_at >= date('now','start of month') has no upper bound; :77-78 hours/revenue likewise no upper bounds. :136-137 label Classes This Month. :94 date(c.scheduled_at)=todayLocal where todayLocal at :28 uses MYT; SQLite date on UTC ISO uses UTC calendar date. lib/format.ts:4,6-7 displays MYT.
Scenario month November: scheduled Nov10 and Dec10 -> Classes This Month2 rather than1. Class Nov12 01:00 MYT stored Nov11T17:00Z -> not selected for Today's Agenda on Nov12 even though formatted Nov12; Nov13 01:00MYT stored Nov12T17:00Z incorrectly included instead. Fix: derive explicit MYT day/month start/end UTC bounds and use >= lower AND < upper consistently. Follow-on actions timezone parsing is handled by backend auditor.

### R6 — High — SQLite text timestamp comparison makes today's past sessions appear upcoming
Evidence: app/students/[id]/page.tsx:72 and app/share/[token]/page.tsx:29 compare ISO timestamps (`2026-11-12T01:00:00.000Z`) against SQLite datetime('now') (`2026-11-12 15:00:00`). 'T' sorts after space regardless time. actions.ts:237/273 stores toISOString. Other screens use Date.toISOString bound, e.g student dashboard:31,49 and parent schedule:30-34.
Scenario now Nov12T15Z, uncompleted scheduled class Nov12T01Z: parent dashboard + admin student detail list it upcoming; student dashboard and parent schedule exclude it. Fix normalized comparison using same ISO representation or julianday/datetime normalization; test same-day past/current/future, next day.

### R7 — High — published upcoming counter silently capped at five; student details counts silently capped at ten
Evidence parent share page query LIMIT5 at :29; stat upcoming.length at :119 labelled Upcoming classes scheduled. Student dashboard counts independent full query, so parent with 8 future classes shows5 while student shows8. Admin student detail :72 LIMIT10 upcoming, :80 LIMIT10 invoices; :329 labels scheduled count and :442 says invoices.length total, yielding10 total when11 invoices exist. Past history uses LIMIT10 no navigation; no dedicated per-student full history link. Fix separate COUNT queries, label previews accurately, add full-list access/pagination where needed. High for cross-user key metric, Medium for capped invoice history.

### R8 — High — resubmission permitted in backend but impossible through student UI
Evidence existing decision Q5 explicitly latest replaces previous. app/portal/student/[studentId]/classroom/post/[postId]/page.tsx:125-129 replaces SubmissionForm entirely with SubmittedWork after first submission; SubmittedWork has no edit/resubmit/withdraw controls. actions.ts:1068 supports upsert. Scenario first submission contains wrong link; student can only view it, cannot use intended latest-replaces flow without direct server action. Fix add resubmit action/form prefilled from current submission, and confirm grading semantics on resubmission with backend auditor (upsert currently preserves grade/graded_at).

### R9 — Medium — revenue chart paid series groups by invoice issuance, collected-revenue KPI by paid_at
Evidence app/page.tsx:78 monthly revenue uses paid_at; :84-89 chart groups all records by issued_at and counts paid status, labelled Revenue Overview at :207 and last6months. Invoice index app/invoices/page.tsx:77-84 calls paid_at aggregation Collected revenue. Scenario October invoice RM80 paid November: November KPI80 but chart paid80 in October, zero November. Policy-dependent: choose cash vs accrual basis, or explicitly relabel chart to invoice issue cohorts. Do not arbitrarily force either accounting basis.

### R10 — Medium — invoice filter controls are decorative
Evidence app/invoices/page.tsx:162-188 filter-looking status Badge elements have cursor-pointer and hover styles but no onClick/form/link; table :231 maps unfiltered invoices. Clicking Paid never filters. Fix real URL-based filters or remove action affordance/label as status counts. Traced UI handler absence, not browser-click-tested.

### R11 — Medium — QR UI promises 2MB while action rejects above 500KB
Evidence app/settings/page.tsx:180 "PNG, JPG or SVG up to 2MB", lib/actions.ts:963 rejects >512000. Scenario 700KB valid PNG fails despite displayed limit. Mechanical align label with existing 500KB ceiling (500KB chosen by previous fix-log).

### R12 — Medium — mobile zoom disabled
Evidence app/layout.tsx:28 maximumScale1 globally; prevents zoom for vision needs in browsers honoring it. Fix remove maximumScale1. Browser/accessibility impact not executed.

## Cross-user consistency / ripple notes

- Class attendance source classes.attendance is live on all reloads; present/late rate formulas conflict (R4). Student dashboard lists raw attendance; parent report page JOIN reports/class shows even canceled classes if report exists. Whether reports must vanish upon cancellation is policy-dependent; do not assert defect without policy.
- Invoice status source invoices.status live on all reloads; parent outstanding fails cancellation (R3), admin correct. Financial lines/total are frozen rows but student name, business identity, currency, QR and contact fields live at render (invoice details admin and parent); historical-document immutability requires policy decision before changing snapshots. Changing currency setting relabels all past amounts without conversion; existing app intentionally single currency but retroactive behavior should be confirmed.
- Upcoming sources conflict ISO vs SQLite timestamp formats (R6) and limit based counter (R7). Parent schedule has full future list and30 past; student schedule only +/-3months, admin calendar -1/+2months, no server fetch on other navigation identified here (components auditor handling calendar).
- No polling/realtime in server pages themselves. force-dynamic disables static page generation but does not make an already-open browser page live. Other-role screens require refetch/reload; notification bell client polling elsewhere. Do not call expected immediate realtime a defect absent promise.
- Student active flag checked by student layout and pages, not meeting page (meeting validates session owner but not active). Parent token access remains valid for inactive students. User policy: does deactivation only stop future scheduling/login, or revoke existing student sessions and parent links? Preserve history per prior Q6.
- Admin class details always offers attendance/report/edit/delete even canceled or completed; backend must enforce chosen lifecycle. UI does not warn invoiced/paid downstream documents (backend audit owns destructive consistency).
- Student post detail supports four type labels but only assignments offer submission UI; no quiz-question read or answer controls in any app page. Backend quiz support appears orphaned unless component inspection finds renderer; not claimed broken feature because create-post UI may only offer assignment/material/announcement.

## Screen / role / query / action catalog

All database-rendering screens use force-dynamic (except new-student static form). No route-local loading.tsx or not-found.tsx exists. Empty lists generally have explicit explanatory states; parent attendance list has blank empty list but zero-rate cards. Errors route to app/error.tsx with error.message/reset. Client login forms show invalid credential result; thrown DB/network errors reach error boundary rather than inline.

| Screen/file | Actor | Read sources/formulas | Actions / tabs / states |
|---|---|---|---|
| / app/page.tsx | Admin intended, cookie-only | active students; classes/upcoming/needs-report/today/last30 attendance; invoice outstanding/monthly/revenue cohorts | quick add/schedule; links to class, invoices; empty widgets |
| /students | Admin intended, cookie-only | students all incl inactive; active/inactive count; average rate all students | add student dialog; export; profile links |
| /students/new | Admin intended, cookie-only | none | createStudent; full-name required/email native, rate has no min; cancel |
| /students/:id | Admin intended, cookie-only | student all fields;10 upcoming,10 past,10 invoices; all running notes;20 teacher notes/reports; share token; attendance/revenue counts | edit dialog; schedule dialog; share/revoke link; invoice generation; add/delete notes; report expandable rows; copy login |
| /students/:id/edit | Admin intended, cookie-only | full student | updateStudent, active checkbox, deleteStudent with no browser required validation; cancel |
| /schedule | verified Admin | classes -1/+2months + teacher notes; active student options | calendar wrapper; recurring dialog; export |
| /schedule/new | Admin intended, cookie-only | full active students | createClass; datetime-local, duration, subject/location/trial; cancel; no-students state |
| /schedule/recurring/new | Admin intended, cookie-only | full active students | createRecurrence; days checkboxes,time,duration,frequency/custom,date range; no-students state |
| /classes/:id | Admin intended, cookie-only | class; student; report; teacher note | attendance3 forms; cancel/reschedule dialog only scheduled; save report; update schedule/status/attendance; delete; join meeting; WhatsApp; automatic report dialog |
| /invoices | Admin intended, cookie-only | invoices+student; outstanding excluding canceled; paid_at current-month; collection ratio count | generate dialog; CSV; detail links; decorative status tabs R10 |
| /invoices/new | Admin intended, cookie-only | full active students | generateInvoice; date period, notes; native required; no-students state |
| /invoices/:id | Admin intended, cookie-only | invoice+line snapshots; live student identity/business/currency/QR/payment settings | status5 buttons, delete, WhatsApp, print, student link |
| /invoices/:id/PrintButton | inherited | browser page | window.print() |
| /classroom | Admin intended, cookie-only | active students with per-student post_count | links to classrooms; empty roster |
| /classroom/:studentId | Admin intended, cookie-only | student active; posts/topics/submissions same student | ClassroomTabs Classwork/Grades; ClassroomActions create post; all-classrooms back |
| /classroom/:studentId/post/:postId | Admin intended, cookie-only | active URL student; arbitrary post by id; attachments; own-path student submission | assignment Instructions/Student Work tabs, grade form; edit/delete post; back link |
| /requests | Admin intended, cookie-only | reschedule_requests JOIN student/class, pending first | approve selected time/reject via component; pending count; empty state |
| /notifications | Admin intended, cookie-only | latest50 admin notifications, unread among50 | markAllRead; notification view links; empty state |
| /settings | Admin intended, cookie-only | business/contact/currency/payment/QR; holidays | saveSettings; add/delete holiday; QR upload/remove; notification toggle |
| /portal/admin | Public | no DB until login | loginAdmin client form with inline invalid response; transition disable |
| /portal/student | Public | no DB until login | loginStudent client form with inline invalid response; transition disable |
| /portal/student/:studentId/layout | verified own active Student | getStudentSession; active student own URL ID | PortalNav + children |
| /portal/student/:id | own active Student via layout | own classes; first5 upcoming;3 recent completed; count/upcoming/completed/hours | join meeting; full schedule link; empty states |
| /portal/student/:id/schedule | own active Student via layout | own classes +/-3months, month grouped in server timezone | per scheduled class reschedule dialog / join; status/attendance; cancellation reason; empty state |
| /portal/student/:id/profile | own active Student via layout | own profile incl password; active parent token | copy guardian link; contact-tutor credential instruction |
| /portal/student/:id/notes | own active Student via layout | class_notes student scope JOIN owned classes | read private notes; empty join-meeting instruction |
| /portal/student/:id/notifications | own active Student via layout | latest50 student recipient notifications | markAllRead; view links; empty state |
| /portal/student/:id/classroom | own active Student via layout | own posts/topics/submissions | ClassroomTabs student Classwork; no Grades management |
| /portal/student/:id/classroom/post/:postId | own active Student via layout but foreign post allowed R2 | active URL student; post unscoped; post attachments; submission by both ids | assignment first submit only, status/missing/late/graded feedback; attachment links |
| /meeting/:classId | verified admin or owning student session | class exists+room; student (no active predicate); scope-specific notes; JaaS JWT | MeetingRoom (notes, meeting, leave); completed/canceled/past room not blocked server |
| /share/:token/layout | parent bearer token public | active share token + student exists (inactive allowed) + business name | ParentNav |
| /share/:token | token parent | student; first5 upcoming (mixed timestamp); full attendance counters;3 invoices | view all schedule/invoices; dashboard summaries |
| /share/:token/attendance | token parent | all classes + completed attendance counters | read only badges; no explicit empty list text |
| /share/:token/schedule | token parent | full upcoming ISO bound;30 past+non-scheduled | read only status/attendance/trial, no meetings |
| /share/:token/reports | token parent | reports JOIN classes own student, any class status | read only report/ratings; empty state |
| /share/:token/invoices | token parent | all own invoices; incorrect outstanding R3 | detail links; empty state |
| /share/:token/invoices/:invoiceId | token parent | invoice id AND token student_id (correct ID isolation); line snapshots/live identity/settings | print; back; status/paid timestamp |
| /login | Public | none | redirect admin login |
| /portal | Public | none | redirect student login |
| /portal/:studentId | cookie-only middleware legacy | none | redirect own parameter to new student route |
| app/layout.tsx | All | font metadata/viewport | client Nav/LayoutShell/MainWrapper/Toaster; no server auth |
| app/error.tsx | All failed route render | error.message | retry/reset; console.error in useEffect |
| app/globals.css | All | theme variables/dark theme/print | print hides nav/aside/header/.no-print; tables/cards optimized |

## Assigned file coverage
- READ `app/classes/[id]/page.tsx` (482 lines)
- READ `app/classroom/[studentId]/page.tsx` (62 lines)
- READ `app/classroom/[studentId]/post/[postId]/page.tsx` (351 lines)
- READ `app/classroom/page.tsx` (92 lines)
- READ `app/error.tsx` (26 lines)
- READ `app/globals.css` (172 lines)
- READ `app/invoices/[id]/PrintButton.tsx` (11 lines)
- READ `app/invoices/[id]/page.tsx` (309 lines)
- READ `app/invoices/new/page.tsx` (86 lines)
- READ `app/invoices/page.tsx` (267 lines)
- READ `app/layout.tsx` (46 lines)
- READ `app/login/page.tsx` (5 lines)
- READ `app/meeting/[classId]/page.tsx` (72 lines)
- READ `app/notifications/page.tsx` (98 lines)
- READ `app/page.tsx` (519 lines)
- READ `app/portal/[studentId]/page.tsx` (5 lines)
- READ `app/portal/admin/page.tsx` (90 lines)
- READ `app/portal/page.tsx` (5 lines)
- READ `app/portal/student/[studentId]/classroom/page.tsx` (54 lines)
- READ `app/portal/student/[studentId]/classroom/post/[postId]/page.tsx` (263 lines)
- READ `app/portal/student/[studentId]/layout.tsx` (41 lines)
- READ `app/portal/student/[studentId]/notes/page.tsx` (85 lines)
- READ `app/portal/student/[studentId]/notifications/page.tsx` (113 lines)
- READ `app/portal/student/[studentId]/page.tsx` (269 lines)
- READ `app/portal/student/[studentId]/profile/page.tsx` (193 lines)
- READ `app/portal/student/[studentId]/schedule/page.tsx` (187 lines)
- READ `app/portal/student/page.tsx` (93 lines)
- READ `app/requests/page.tsx` (115 lines)
- READ `app/schedule/new/page.tsx` (98 lines)
- READ `app/schedule/page.tsx` (73 lines)
- READ `app/schedule/recurring/new/page.tsx` (101 lines)
- READ `app/settings/page.tsx` (215 lines)
- READ `app/share/[token]/attendance/page.tsx` (142 lines)
- READ `app/share/[token]/invoices/[invoiceId]/page.tsx` (223 lines)
- READ `app/share/[token]/invoices/page.tsx` (161 lines)
- READ `app/share/[token]/layout.tsx` (43 lines)
- READ `app/share/[token]/page.tsx` (218 lines)
- READ `app/share/[token]/reports/page.tsx` (152 lines)
- READ `app/share/[token]/schedule/page.tsx` (145 lines)
- READ `app/students/[id]/edit/page.tsx` (86 lines)
- READ `app/students/[id]/page.tsx` (610 lines)
- READ `app/students/new/page.tsx` (52 lines)
- READ `app/students/page.tsx` (237 lines)

Actual full assigned file count: 43. Every assigned file read; API upload intentionally assigned to backend auditor.

## Parent runtime evidence upgrade
R1 Executed: forged admin cookie exposes students/settings/invoices/requests/notifications; /schedule redirects307. R2 Executed: authenticated Alice own student URL with Bob post id renders BOB_PRIVATE_MARKER in Playwright. Controls: admin/student login passed; valid parent token200 invalid404; cross-student dashboard307. Evidence supplied by parent, not independently rerun by route auditor.
