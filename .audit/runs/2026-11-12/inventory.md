# Actor, screen and action inventory

Actors: public visitor; authenticated admin; authenticated active student; inactive student with old token; bearer parent; system migrations and external video/upload services. No independent tutor/branch roles exist. Admin can manage all records; student intended scope is self-owned classes/posts; parent read-only token scope is one student. Dual-role people use distinct cookies; no combined permission model. Class membership is students.id, not a group enrollment model.

The following module catalogs cover every discovered route/action/modal/tab and distinguish dead exports/backup examples from reachable UI. Loading: no app loading.tsx; shared app/error.tsx; most empty lists have explicit EmptyState. Role guards are described as implemented rather than assumed secure. Baseline validation/pending/error/cross-role/atomicity concerns are findings in report.md. No job/webhook/scheduler routes were found.



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


## Exported action inventory


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


## Modal/component inventory


All current data-changing calls are server actions; no React Query/SWR caches in these files. router.refresh() is local to acting browser; no cross-user realtime subscription. UI-only state includes sidebar localStorage, selected dates/month, open dialogs, topic selection, notes dirty flags, clipboard feedback, chart rendering. All data displays are props from server pages; screen catalog must identify server queries.

| File/group | Visible surfaces/actions | Mutation/read and freshness |
|---|---|---|
| Nav.tsx | Admin sections, mobile drawer, collapse, Logout | logoutAdmin form; pathname live; sidebar stored localStorage |
| portal-nav.tsx | Student dashboard/schedule/classroom/notes/notifications/profile; logout; unused parent-role branch | logoutStudent; route props |
| parent-nav.tsx | Token dashboard,attendance,schedule,reports,invoices; mobile nav | no writes; token base path |
| add-student-dialog.tsx | Add student modal, credentials explanation | createStudentQuick; refresh + push detail; HTML required name/email only |
| edit-student-dialog.tsx | Edit name/rate/contact/active modal | updateStudentQuick; refresh; uncontrolled defaults |
| schedule-class-dialog.tsx | New one-off date/time/duration/trial | createClassQuick; refresh; required student/date; no positive duration min |
| recurring-schedule-dialog.tsx | Multiple weekdays,custom interval,date bounds | createRecurrenceQuick; refresh; no checkbox required group or numeric bounds |
| generate-invoice-dialog.tsx | Student,period,notes; inline action error | generateInvoiceQuick; refresh + invoice navigation |
| schedule-calendar-wrapper.tsx | All calendar views,event details,add-slot dialog,attendance,Cancel/Delete,reschedule,meeting/copy | createClassQuick,markAttendance,cancelClassQuick,rescheduleClassQuick; local refresh; stale selectedClass snapshot while dialog open |
| schedule-calendar.tsx | Legacy monthly calendar,list,counts | props only; unused current route |
| cancel-dialog.tsx | Inline cancel reason + optional reschedule form | cancelClass bound; no pending/confirmation beyond inline open |
| reschedule-request-dialog.tsx | Student preference times1-3/reason | createRescheduleRequest; toast/result handling + refresh |
| reschedule-actions.tsx | Admin approve/reject + time/note | approveRescheduleRequest/rejectRescheduleRequest; refresh; result handling |
| post-class-report-dialog.tsx | report query opens modal;topics/homework/performance/rating | saveReportQuick; toast,refresh; no existing report prefill; retained saved state until remount |
| meeting-room.tsx | video,notes toggle/autosave/manual,copy,leave | saveClassNotes by scope; dirty/debounce state; navigation |
| jitsi-meeting.tsx | script/iframe lifecycle/loading/error/external fallback | third-party video; no DB write; 10s timeout only checks iframe existence |
| classroom-post-dialog.tsx | New/edit material/assignment/announcement;delete confirmation;inline create topic | createPostAction,updatePost,deletePostAction,createTopic; refresh; topic stale copy |
| classroom/classroom-tabs.tsx | Classwork topics/collapse/status and admin Grades tab | props; assignment Missing compares client clock; submission status derived graded_at/submitted |
| classroom/topic-manager.tsx | Create/rename/delete topic inline/dropdown | createTopic/renameTopic/deleteTopic; refresh; delete no confirm |
| classroom/submission-form.tsx | Student content/link/file upload,Turn in | POST/api/upload then submitAssignment; upload errors local;10MB client limit |
| classroom/grade-submission.tsx | Admin Return/update grade,feedback;submission card | gradeSubmissionAction; refresh; state snapshots |
| classroom/classroom-banner.tsx | Student name/subject | props only |
| share-token-button.tsx | Generate/copy/revoke parent link | generateShareToken/revokeShareToken; own token state; no pending lock |
| notes-table.tsx | Search,expand,delete note | supplied deleteAction(noteId,studentId); server props; created_at parsed browser zone |
| report-row.tsx | Expand report,link class | props,local expansion |
| notification-bell.tsx | badge + inbox link | server unreadCount prop; no polling |
| notification-toggle.tsx | Request browser permission | one-off Notification only |
| attendance-chart.tsx | Present/late/absent ring | present/total%; props; total includes supplied denominator |
| revenue-chart.tsx | Paid/outstanding bars | props; month-only tick labels; no writes |
| dashboard-actions.tsx | Compose schedule/add student/invoice dialogs | calls via modal components |
| copy-link-button.tsx | Clipboard absolute/relative link | browser-only; immediate success |
| copy-login-button.tsx | Clipboard credentials + URL | awaits clipboard; no error UI |
| export-button.tsx | CSV download | calls supplied getData; Blob link; no pending/error |
| whatsapp-share.tsx | User initiated external WhatsApp compose | window.open wa.me; no automatic send |
| empty-state.tsx,form-field.tsx,page-header.tsx | Layout/form primitives | props only |
| layout-shell.tsx,main-wrapper.tsx | Sidebar context/localStorage,route margins | browser-only UI state |
| examples/c-event-calendar-1.tsx.bak | Inactive vendor demo incl resource/timezone settings | backup, not imported/shipped; mock local events |
