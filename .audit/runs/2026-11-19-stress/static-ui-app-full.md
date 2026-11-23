# Static UI app full-read review

Reviewer scope: all `app/**/*.tsx` except `app/students/**`. Parent reviewer explicitly took `app/students/**` and `app/globals.css`; those are not claimed read here. API routes and imported implementation modules are outside this review. No source edits, tests, builds or browser checks were performed.

Read `CLAUDE.md` fully. README was read in full; the large capability guide output was truncated, so it is not claimed fully read. App source was read in complete 100-line segments with bounded, untruncated outputs, including every JSX section rather than only auth/query matches.

## Findings

No critical actionable defect established in the assigned app route source.

Two noncritical UI inconsistencies are directly established:

- `app/invoices/[id]/page.tsx:385-395` describes the invoice operation as irreversible deletion and says the invoice cannot be recovered; the actual button and confirmation at lines 400-401 say Cancel invoice and explicitly retain history. This is misleading action copy. The parent/root owns mutations; this review made no change.
- `app/invoices/page.tsx:160` displays `fmtDate(i.period_end)` directly, whereas invoice detail at `app/invoices/[id]/page.tsx:121-123` subtracts one millisecond from an exclusive MYT midnight endpoint. For a UTC `...T16:00:00.000Z` month-end boundary, the list can display the following calendar day while detail displays the preceding inclusive day. Parent invoice routes use `invoiceCalendarPeriod` consistently. Recommend using that shared helper for the admin list/detail, after checking helper/mutation coverage.

## Auth and state observations

- Every reviewed admin data page calls `requireAdminPage` before private queries. Redirect-only legacy routes have no private reads. Public login pages use explicit pending/error state and server login actions.
- Student routes independently call `ownStudentContext` or `requireStudent`, including classroom and post details. Post lookup uses both post ID and student ID. Student row projections omit passwords/private tutor notes. Student notes select only student scope; submission history is scoped through the authorized current submission ID.
- Parent data pages independently call `requireParent`, beyond the parent layout, and scope reads to the resulting student. Parent invoice detail excludes drafts and checks both invoice/student IDs. Canceled documents remain visible as history but do not contribute to outstanding totals.
- Meeting authorization obtains actual admin or student session, denies another student's class, checks active student, and selects only the viewer's notes scope. JWT generation receives the exact persisted room. Lesson whiteboard joins the authorized active owning student; admins can see retained history.
- Admin/student post views render current submission version and separately fetch immutable attempts. Admin grading component is keyed by submission ID, version and graded timestamp; mutation-side concurrency is outside this route-source review. Root owns the known post-comments race.
- Admin notifications count all unread separately from the 50-message display limit. Student notification links are constrained to the student's own portal prefix.
- Financial views use billing-month helpers and exclude canceled invoices from revenue. Attendance reads normalize legacy Late to Present and omit canceled lessons from the rate. Recurrence UI explains the current-year December default and history-preserving stop behavior.

## Exact full files read

| File | Lines |
| --- | ---: |
| `app/chats/page.tsx` | 7 |
| `app/classes/[id]/page.tsx` | 508 |
| `app/classroom/[studentId]/page.tsx` | 77 |
| `app/classroom/[studentId]/post/[postId]/page.tsx` | 449 |
| `app/classroom/page.tsx` | 70 |
| `app/dashboard/page.tsx` | 370 |
| `app/diagnostics/[studentId]/page.tsx` | 5 |
| `app/diagnostics/page.tsx` | 4 |
| `app/error.tsx` | 42 |
| `app/financial-history/page.tsx` | 293 |
| `app/invoices/[id]/PrintButton.tsx` | 11 |
| `app/invoices/[id]/page.tsx` | 408 |
| `app/invoices/new/page.tsx` | 50 |
| `app/invoices/page.tsx` | 195 |
| `app/layout.tsx` | 50 |
| `app/loading.tsx` | 28 |
| `app/login/page.tsx` | 5 |
| `app/meeting/[classId]/page.tsx` | 80 |
| `app/meeting/[classId]/whiteboard/page.tsx` | 61 |
| `app/notifications/page.tsx` | 127 |
| `app/overview/page.tsx` | 75 |
| `app/page.tsx` | 4 |
| `app/portal/[studentId]/page.tsx` | 6 |
| `app/portal/admin/page.tsx` | 95 |
| `app/portal/page.tsx` | 5 |
| `app/portal/student/[studentId]/chat/page.tsx` | 8 |
| `app/portal/student/[studentId]/classroom/page.tsx` | 62 |
| `app/portal/student/[studentId]/classroom/post/[postId]/page.tsx` | 215 |
| `app/portal/student/[studentId]/diagnostic/page.tsx` | 4 |
| `app/portal/student/[studentId]/layout.tsx` | 29 |
| `app/portal/student/[studentId]/notes/page.tsx` | 101 |
| `app/portal/student/[studentId]/notifications/page.tsx` | 102 |
| `app/portal/student/[studentId]/page.tsx` | 352 |
| `app/portal/student/[studentId]/profile/page.tsx` | 219 |
| `app/portal/student/[studentId]/schedule/page.tsx` | 241 |
| `app/portal/student/page.tsx` | 98 |
| `app/requests/page.tsx` | 157 |
| `app/schedule/new/page.tsx` | 84 |
| `app/schedule/page.tsx` | 97 |
| `app/schedule/recurring/new/page.tsx` | 80 |
| `app/schedule/recurring/page.tsx` | 38 |
| `app/settings/page.tsx` | 140 |
| `app/share/[token]/attendance/page.tsx` | 122 |
| `app/share/[token]/chat/page.tsx` | 8 |
| `app/share/[token]/invoices/[invoiceId]/page.tsx` | 281 |
| `app/share/[token]/invoices/page.tsx` | 198 |
| `app/share/[token]/layout.tsx` | 33 |
| `app/share/[token]/page.tsx` | 195 |
| `app/share/[token]/reports/page.tsx` | 29 |
| `app/share/[token]/schedule/page.tsx` | 123 |
| `app/whiteboard/page.tsx` | 54 |

Total: 51 app TSX files, 6,095 lines, all read in full.
