# UI, app route and middleware static review

Evidence level: **Traced**, unless explicitly attributed to existing executed evidence. No builds, browser runs or source edits were performed by this review group. Source was read in bounded output batches; earlier truncated discovery output does not count as full-read coverage. Full-read ledgers below supersede discovery scans.

## Coverage

- This reviewer: `static-ui-own-read-ledger.json` records exact files, full line counts and SHA-256 at read completion (API routes, students routes, styles, middleware and seven shared components).
- App reader: `static-ui-app-full.md` records all51 remaining app TSX routes,6,095 lines, fully read.
- Component reader: `static-ui-components-full.md` records all64 remaining custom component files,11,281 lines, fully read.

Combined full coverage: **144 source files / 22,300 lines**, excluding the explicit vendored/generated dependencies below. Exact inventories are disjoint; no truncated discovery reads count toward these totals.

## Observations from this reviewer's full reads

- Middleware (`middleware.ts:48-49`) explicitly delegates API authentication to route/service handlers. Cookie presence for admin/student/meeting paths is only an early redirect; it is not proof of a session. Public `/share/` routes depend on their own bearer guards.
- All five student-management pages authorize through `requireAdminPage` before student reads; profile credentials/private teacher notes remain admin-only in these pages. History read queries scope `student_id` and parameterize search/pagination.
- Classroom attachment/comments routes call `classroomAccess` before reads and comments derive editing/deletion capabilities from the returned actor (`app/api/classroom/posts/[postId]/comments/route.ts:11-16,37-52`). Concrete student A -> post B request reaches that gate before the post-scoped SELECT. Service internals are covered by domain review, not re-executed here.
- File access (`app/api/files/[fileId]/route.ts:25-124`) resolves real admin/student sessions, gives an explicitly supplied parent token precedence over a student cookie, verifies active bearer and token-owned uploads, and otherwise checks same-student shared records before transfer. Nonadmin unrelated IDs return404. Parent access cannot fall through to general student classwork file grants.
- Upload chunks validate signed ticket actor, actual current session/token, same-host Origin, bounded request bytes, matching range/total and an allowlisted HTTPS Drive upload URL (`app/api/upload/chunk/route.ts:13-120`). Begin/finish use signed ticket and verify returned file identity. Actual provider behavior is separately tested by the root's controlled-provider evidence.
- Chat/diagnostic APIs parse JSON before domain calls and return intentional400/403 results for malformed payload/origin. Their viewer values are still client input; authorization is delegated to the respective domain service and must remain there.
- Whiteboard route requires same-origin mutation, bounded JSON stream and service authorization/revision handling (`app/api/whiteboards/[boardId]/route.ts:15-53,97-143`).
- `NoteSaveQueue` serializes writes and loops until latest text equals persisted text; failed writes leave it dirty. `LessonActionForm` prevents repeated submissions with a ref, disables pending fields and retains input on caught failures. RichText renders through the centralized `richTextHtml` sanitizer and adds parent bearer only to local file image URLs.
- Global CSS includes focus rings, reduced-motion overrides, container-responsive schedule fields, phone table records and print-specific table restoration; these are source observations, not visual verification.

## Findings and existing fixes

- **Known, assigned to root:** delayed `PostComments.load` updates and duplicate older-page merges. Original source at `components/post-comments.tsx:51-70` commits data unconditionally; effect cleanup at72-84 guards loading/errors only. Root is implementing/regression testing this; this report does not claim it fixed or tested.
- **Noncritical temporal inconsistency found and corrected by root (Traced):** `app/students/[id]/page.tsx:112` compares upcoming `scheduled_at >= ?` as text against `new Date().toISOString()`. Given now `2026-11-23T01:00:00Z`, a same-day future legacy row `2026-11-23 02:00:00` sorts before `T` and disappears from the profile preview; full upcoming history at `app/students/[id]/history/page.tsx:56` uses `julianday` and includes it. This extends the known calendar legacy-timestamp root cause (F09); root normalized this comparison/order to `julianday` during review; verification is recorded by root separately. No billing data is changed by the display bug.
- Existing `fix-log.json` F01-F15 contains prior findings and executed evidence; those statuses are not re-certified by a static read. Current patterns reflect pending draft retention in edited dialogs, pending-state schedule controls, numeric grade bounds and malformed request handling.
- Component full reader established a **Traced P2 continuation race** in `FamilyChat`: after an initial live check, additional >200-ID refresh batches await response bodies before unconditional state updates (`components/family-chat.tsx:90-97`). Cleanup aborts network requests, but a completed fetch with pending JSON processing can outlive room selection. Reported to root to extend F01; no server authorization bypass inferred.
- Component full reader recorded a **candidate**, not established full-chain finding: gradebook renders a graded score against mutable post maximum while attempt history uses snapshot maximum. See `static-ui-components-full.md` for exact lines; query/mutation tracing still needed before promotion.
- App full reader recorded two noncritical invoice presentation inconsistencies: permanent-delete wording for history-preserving cancellation, and exclusive period-end display mismatch between list/detail. See `static-ui-app-full.md`.
- No additional critical actionable defect established by the full UI/static read.

## Explicit omissions

- `components/reui/**`: vendored calendar implementation; omitted as vendored dependency.
- `components/ui/**`: unchanged generated shadcn/Radix presentation primitives; no git diff in this directory. Omitted as vendored/generated UI dependency, not counted as custom-source full coverage.
- `components/examples/c-event-calendar-1.tsx.bak`: unused backup, not active source.
- Generated `.next`, `node_modules`, `.git`, binaries/images/fonts and vendor assets are not source-review coverage.
- `lib/**`, tests, scripts and configuration are owned by the other audit read groups; not counted in this UI ledger.

## Exact own full-read inventory

- `app/api/chats/[studentId]/route.ts` — lines1–18
- `app/api/chats/route.ts` — lines1–7
- `app/api/classroom/posts/[postId]/attachments/route.ts` — lines1–31
- `app/api/classroom/posts/[postId]/comments/route.ts` — lines1–70
- `app/api/cron/monthly-invoices/route.ts` — lines1–27
- `app/api/diagnostics/[studentId]/route.ts` — lines1–15
- `app/api/diagnostics/route.ts` — lines1–4
- `app/api/diagnostics/template/route.ts` — lines1–12
- `app/api/files/[fileId]/route.ts` — lines1–258
- `app/api/storage/setup/route.ts` — lines1–23
- `app/api/upload/chunk/route.ts` — lines1–165
- `app/api/upload/recent/route.ts` — lines1–121
- `app/api/upload/route.ts` — lines1–358
- `app/api/whiteboards/[boardId]/route.ts` — lines1–146
- `app/students/[id]/edit/page.tsx` — lines1–181
- `app/students/[id]/history/page.tsx` — lines1–255
- `app/students/[id]/page.tsx` — lines1–837
- `app/students/new/page.tsx` — lines1–129
- `app/students/page.tsx` — lines1–259
- `app/globals.css` — lines1–626
- `styles/shadcn.css` — lines1–637
- `middleware.ts` — lines1–91
- `components/use-chat-outbox.ts` — lines1–39
- `components/note-save-queue.ts` — lines1–36
- `components/post-comments.tsx` — lines1–346
- `components/notification-read-link.tsx` — lines1–62
- `components/lesson-action-form.tsx` — lines1–72
- `components/rich-text.tsx` — lines1–78
- `components/family-chat-unread.ts` — lines1–21
