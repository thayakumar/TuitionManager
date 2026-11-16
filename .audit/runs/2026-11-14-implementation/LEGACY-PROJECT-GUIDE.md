# TuitionManager — Project Guide

## What This Is
Personal tuition management system for Ananth — a private tutor managing students, classes, invoices, classroom (LMS), and video meetings.
Built with **Next.js 14 App Router** + **Turso** (cloud SQLite) + **shadcn/ui** (new-york style) + **ReUI** component registry.

## Tech Stack
- **Framework**: Next.js 14.2.33 (App Router, server components, server actions)
- **Database**: Turso (libSQL) — async API via `@libsql/client`
- **UI**: shadcn/ui new-york style + ReUI registry + custom wrappers (page-header, empty-state, form-field)
- **Styling**: Tailwind CSS v4 + tailwindcss-animate, Inter font via next/font/google
- **Icons**: lucide-react
- **Calendar**: react-day-picker v10 + date-fns v4
- **Video**: Jitsi Meet (external embed, no dependency)
- **Deployment target**: Vercel + Turso cloud

## Key Architecture

### Lib Layer
- `lib/db.ts` — singleton Turso client (`getClient()`), query helpers (`queryAll<T>()`, `queryOne<T>()`, `execute()`), `getSetting()`, `ensureMigrated()` with full schema in `migrate()`
- `lib/actions.ts` — **all** server actions (~1100 lines): auth (admin + student login/logout), student CRUD, class CRUD + cancel/reschedule, report save, invoice generation, recurring scheduling + holiday-aware class generation, student notes, share tokens, posts + topics + submissions + grading + quiz answers + attachments, meeting notes save, settings + DuitNow QR
- `lib/auth.ts` — session management: admin session (random hex token stored in settings table, httpOnly cookie `admin_session`), student session (`studentId:randomHex` token, httpOnly cookie `student_session`)
- `lib/types.ts` — all TypeScript types: Student, ClassRow, ClassWithStudent, Report, Invoice, InvoiceItem, Recurrence, Holiday, StudentNote, ShareToken, Post, PostWithMeta, PostAttachment, Submission, QuizQuestion, QuizAnswer, Topic + status/enum types
- `lib/format.ts` — `currency()`, `fmtDate()`, `fmtDateTime()`, `fmtTime()`, `fmtDateInput()`, `fmtISODate()`, `fmtShortDate()`
- `lib/export.ts` — CSV export server actions: `exportStudentsCsv()`, `exportClassesCsv()`, `exportInvoicesCsv()`
- `lib/utils.ts` — `cn()` classname merger

### Middleware
- `middleware.ts` — auth guard for all routes. Public paths: `/login`, `/portal/admin`, `/portal/student`, `/portal`, `/share/*`, `/meeting/*`, `/_next/*`, `/api/*`, `/favicon.ico`. Student portal routes require `student_session` cookie. All other routes require `admin_session` cookie. Unauthenticated → redirect to respective login page.

### Admin Dashboard (`app/page.tsx`)
Rich dashboard with: welcome banner, 4 stat cards (students, classes this month, teaching hours, monthly revenue), revenue chart (6 months), today's agenda, attendance donut (30 days), upcoming classes table, needs-report list, recent activity feed, unpaid invoices table. Quick actions for scheduling classes and adding students.

### Admin Pages
- `/students` — list (Avatar + Table), `/students/new` — create form, `/students/[id]` — detail + notes, `/students/[id]/edit` — edit form
- `/schedule` — ReUI event calendar view, `/schedule/new` — schedule class, `/schedule/recurring/new` — recurring schedule
- `/classes/[id]` — class detail with report dialog, cancel dialog, meeting link
- `/invoices` — list with stat cards, `/invoices/[id]` — detail with PrintButton + WhatsApp share, `/invoices/new` — generate invoice dialog
- `/classroom` — list of student classrooms, `/classroom/[studentId]` — Google Classroom-style per-student classroom (banner + Classwork|Grades tabs), `/classroom/[studentId]/post/[postId]` — post detail with Instructions|Student Work tabs + grading form
- `/meeting/[classId]` — full-screen Jitsi meeting room with side panel class notes (admin-only, auto-saves)
- `/settings` — business info, currency, payment instructions, DuitNow QR upload, holiday management, notification toggle

### Student Portal
- `/portal/student` — student login page (username = first name, password = firstname123, auto-generated on student creation)
- `/portal/student/[studentId]` — student dashboard (layout with sidebar nav: Dashboard, My Schedule, My Class, My Profile)
- `/portal/student/[studentId]/classroom` — student classroom view (Classwork tab only, no Grades)
- `/portal/student/[studentId]/classroom/post/[postId]` — read-only post view + assignment submission form
- `/portal/student/[studentId]/schedule` — student schedule view
- `/portal/student/[studentId]/profile` — student profile view

### Parent Share Portal
- `/share/[token]` — read-only parent portal (layout with ParentNav sidebar)
- Sub-routes: `/attendance`, `/invoices`, `/invoices/[invoiceId]`, `/reports`, `/schedule`
- Token-based access: no login, link sharing via `share_tokens` table

### Auth Flow
- Admin: `/portal/admin` → `loginAdmin()` → creates `admin_session` cookie → redirect to `/`
- Student: `/portal/student` → `loginStudent()` → creates `student_session` cookie → redirect to `/portal/student/{id}`
- Old routes `/login` and `/portal` redirect to new locations
- Logout: destroys cookie + deletes session token from settings table

### Key Components
- `components/Nav.tsx` — admin sidebar (collapsible, grouped sections: Menu/Management/Other, mobile Sheet drawer)
- `components/portal-nav.tsx` — student/parent sidebar nav (role-aware links)
- `components/layout-shell.tsx` — sidebar collapse state provider
- `components/main-wrapper.tsx` — content area with sidebar offset
- `components/classroom/classroom-banner.tsx` — gradient banner with student name + subject
- `components/classroom/classroom-tabs.tsx` — Classwork tab (topic-grouped posts, collapsible sections) + Grades tab (admin only, grade table)
- `components/classroom/topic-manager.tsx` — inline topic create/rename/delete
- `components/classroom/grade-submission.tsx` — grade form + submission card
- `components/classroom/submission-form.tsx` — student assignment submission
- `components/classroom-post-dialog.tsx` — create/edit post dialog with type selector, topic selector (always visible with inline "New topic" button), due date, max points
- `components/meeting-room.tsx` — full-screen Jitsi wrapper with top bar, copy link, notes panel (auto-save every 2s), leave → report flow
- `components/jitsi-meeting.tsx` — Jitsi iframe embed
- `components/cancel-dialog.tsx` — cancel with reason + optional reschedule date
- `components/recurring-schedule-dialog.tsx` — recurring class setup (day picker, frequency, date range)
- `components/schedule-class-dialog.tsx` — one-off class scheduling
- `components/generate-invoice-dialog.tsx` — period-based invoice generation
- `components/post-class-report-dialog.tsx` — report form (topics, homework, performance, strengths, areas to improve, rating)
- `components/add-student-dialog.tsx` / `components/edit-student-dialog.tsx` — student forms
- `components/dashboard-actions.tsx` — quick action buttons on dashboard
- `components/revenue-chart.tsx` — bar chart for paid/outstanding revenue
- `components/attendance-chart.tsx` — donut chart for attendance stats
- `components/schedule-calendar-wrapper.tsx` / `components/schedule-calendar.tsx` — calendar view wrappers
- `components/whatsapp-share.tsx` — WhatsApp share button for invoices/reports
- `components/export-button.tsx` — CSV export button
- `components/share-token-button.tsx` — generate/revoke parent share link
- `components/notification-toggle.tsx` — push notification toggle
- `components/reui/event-calendar/` — full ReUI event calendar system (month view, time grid, nav, recurrence, DnD, i18n, etc.)
- `components/ui/` — 20 shadcn components: alert-dialog, avatar, badge, button, calendar, card, checkbox, dialog, dropdown-menu, input, label, popover, progress, scroll-area, select, separator, sheet, skeleton, switch, table, tabs, textarea, tooltip

## Database Schema (Turso)
- URL: `libsql://tuition-manager-ananth.aws-ap-northeast-1.turso.io`
- Credentials in `.env.local` (gitignored)

### Tables (16 total)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `students` | Student roster | name, subject, grade_level, phone, email, guardian_*, hourly_rate, username, password, active |
| `classes` | Scheduled/completed/cancelled classes | student_id, scheduled_at, duration_minutes, status, attendance, meeting_room, meeting_notes, is_trial, cancel_reason, rescheduled_from, recurrence_id |
| `reports` | Post-class reports (1:1 with class) | class_id (unique), topics_covered, homework, performance, strengths, areas_to_improve, rating |
| `invoices` | Invoice headers | student_id, invoice_number (unique), period_start/end, total_amount, status, paid_at |
| `invoice_items` | Invoice line items | invoice_id, class_id, description, quantity, unit_amount, amount |
| `settings` | Key-value config store | key (PK), value — stores business info, currency, DuitNow QR, admin credentials, session tokens |
| `recurrences` | Recurring schedule rules | student_id, day_of_week, time, frequency (weekly/biweekly/custom), start_date, end_date |
| `holidays` | Holiday dates (auto-skip) | name, date (unique) |
| `student_notes` | Running notes log per student | student_id, content, created_at |
| `share_tokens` | Parent share link tokens | student_id, token (unique), active |
| `posts` | Classroom posts (material/assignment/quiz/announcement) | type, title, body, student_id, due_at, topic_id, max_points |
| `post_attachments` | File attachments on posts | post_id, file_name, file_url, file_type |
| `submissions` | Student assignment submissions | post_id, student_id, content, file_url, grade, feedback, graded_at |
| `quiz_questions` | Quiz questions | post_id, question, type (mcq/short_answer), options, correct_answer, points |
| `quiz_answers` | Student quiz answers | question_id, student_id, answer, is_correct |
| `topics` | Classroom topic grouping per student | student_id, name, sort_order |

### ALTER TABLE additions (applied via try/catch for idempotency)
- `classes`: recurrence_id, is_trial, cancel_reason, rescheduled_from, meeting_room, meeting_notes
- `students`: username, password
- `posts`: topic_id, max_points, updated_at

## Invoice Logic (IMPORTANT)
- Classes with status `completed` or `canceled` in the period get invoiced (excludes already-invoiced classes)
- Cancelled classes: show as `[CANCELLED]` prefix, invoiced at RM 0.00
- Trial classes: show as `[TRIAL]` prefix, invoiced at RM 0.00
- Rescheduled classes: created via `cancelClass()` with reschedule date, subject prefixed `[RESCHEDULED]`, invoiced at normal rate
- Invoice number format: `INV-YYYY-NNNN` (auto-incrementing per year)

## Security Model
- Admin auth: session token stored in `settings` table, verified against `admin_session` cookie
- Student auth: `studentId:randomHex` token in `settings`, verified against `student_session` cookie
- Middleware enforces auth on all non-public routes
- Student-facing queries use explicit column lists — **never** `SELECT *` — excluding: hourly_rate, notes, password, meeting_notes
- Meeting notes only fetched for admin sessions
- Students get 307 redirect when trying to access admin routes (/classroom, /students, /settings)
- No admin UI elements (New Post, Create Topic, Edit, Delete, Grade) in student HTML

## GitHub
- Repo: `thayakumar/TuitionManager` (GitHub account: thayakumar)
- Git user locally: ananthtigerlab

## 16-Phase Build Plan — Status
1. ~~Design System + shadcn/ui Setup~~ ✅ (6050de3, 16b8b1a)
2. ~~Database Schema Changes~~ ✅ — recurrences, holidays, student_notes, share_tokens, posts, topics, submissions, quiz tables (6050de3, 915a71f, 349e3bd)
3. ~~Cancel/Reschedule Flow~~ ✅ — cancel-dialog, strikethrough, RM 0 invoice items (6050de3)
4. ~~Recurring Class Scheduling~~ ✅ — weekly/biweekly/custom, recurring-schedule-dialog (6050de3, 915a71f)
5. ~~Holiday Management~~ ✅ — holidays table, auto-skip in recurring generation (6050de3)
6. ~~WhatsApp Share~~ ✅ — whatsapp-share component for invoices/reports (6050de3)
7. ~~PDF Export~~ ✅ — enhanced print CSS, PrintButton (6050de3)
8. ~~Data Export CSV~~ ✅ — export-button for students, classes, invoices (6050de3)
9. ~~DuitNow QR on Invoices~~ ✅ — QR upload via settings (6050de3)
10. ~~Monthly Revenue Chart~~ ✅ — revenue-chart on dashboard (6050de3)
11. ~~Running Student Notes~~ ✅ — student_notes table + log (6050de3)
12. ~~Trial Class Flag~~ ✅ — trial flag with RM 0 invoicing (6050de3)
13. ~~Parent Shareable Link~~ ✅ — share_tokens, /share/[token]/* routes (6050de3, 915a71f)
14. ~~PWA Support~~ ✅ — manifest + app icons (6050de3)
15. ~~Browser Push Notifications~~ ✅ — notification-toggle component (6050de3)
16. ~~Deploy to Vercel~~ ✅ — deployed as `tuition-manager` (prj_4ZV1tUfLfUEcsMimfXE9vkXiAKEj)

## Beyond Original Plan (added post-Phase 15)
- **Auth system** ✅ — admin + student login/logout, session cookies, middleware protection (915a71f)
- **Student portal** ✅ — student login, dashboard, classroom, schedule, profile (915a71f)
- **Classroom / LMS** ✅ — Google Classroom-style with topics, posts, grading, submissions (349e3bd, 94d9699)
- **Video meetings** ✅ — Jitsi integration with full-screen meeting room + class notes panel (915a71f)
- **Login route restructure** ✅ — /portal/admin and /portal/student with redirects (94d9699)
- **Security audit** ✅ — data leakage fixes, explicit column lists, access control hardening (d7036c8)

## Commit History (chronological)

### `9246e94` — Initial commit: personal tuition management system
- Core features: student roster, class scheduling, attendance tracking, post-class reports, invoice generation, dashboard, settings
- Stack: Next.js 14 App Router, SQLite via better-sqlite3, Tailwind CSS, server actions

### `6050de3` — feat: full-feature tuition management system (Phases 1-15)
- **Phase 1**: shadcn/ui base-nova + Tailwind v4 + LMS teal palette + Poppins/Open Sans fonts
- **Phase 2**: Database schema — recurrences, holidays, student_notes, share_tokens tables + new class columns (recurrence_id, is_trial, cancel_reason, rescheduled_from)
- **Phase 3**: Cancel/reschedule flow with dialog, strikethrough display, RM 0 invoice items
- **Phase 4**: Recurring class scheduling (weekly/biweekly/custom intervals with holiday-aware generation)
- **Phase 5**: Holiday management in settings, auto-skip in recurring generation
- **Phase 6**: WhatsApp share for invoices and reports
- **Phase 7**: Enhanced print CSS for PDF export
- **Phase 8**: CSV data export for students, classes, invoices (lib/export.ts)
- **Phase 9**: DuitNow QR code on invoices (base64 upload via settings)
- **Phase 10**: Monthly revenue chart on dashboard (6-month bar chart)
- **Phase 11**: Running student notes log per student
- **Phase 12**: Trial class flag with RM 0 invoicing
- **Phase 13**: Parent shareable read-only link per student (/share/[token]/*)
- **Phase 14**: PWA manifest + app icons
- **Phase 15**: Browser push notification toggle
- Migrated from better-sqlite3 to Turso (libSQL) async client

### `16b8b1a` — feat: complete UI overhaul to polished shadcn/ui style
- Revamped Nav with grouped sections (Menu/Management/Other), GraduationCap logo, mobile Sheet nav, collapsible sidebar
- Dashboard: CardHeader/CardTitle, stat cards, shadcn Tables for all list sections
- Schedule: Calendar view with day-picker, dot indicators, class list panel (ReUI event-calendar)
- Students: Avatar + shadcn Table list
- Invoices: shadcn Table with stat cards
- All detail/form/settings pages wrapped in proper Card structure
- Added shadcn components: Calendar, Avatar, Sheet, Select, DropdownMenu, ScrollArea, Progress
- PageHeader with Separator for visual polish

### `915a71f` — feat: add auth, student portal, classroom, meetings, recurring scheduling, and full app shell
- **Auth**: Admin login/logout with session cookies (lib/auth.ts) + middleware protection (middleware.ts)
- **Student portal**: Login page, dashboard, attendance, invoices, reports, schedule views with PortalNav sidebar
- **Classroom module**: Per-student classroom pages with post-class report dialog
- **Video meetings**: Jitsi Meet integration — MeetingRoom component (full-screen, notes panel, copy link, auto-save)
- **Parent share portal**: Full sub-route layout (/share/[token]/*) with ParentNav sidebar
- **Dialogs**: Recurring schedule, schedule class, generate invoice, add/edit student
- **Charts**: Attendance chart, revenue chart on dashboard
- **Layout**: LayoutShell (sidebar state provider), MainWrapper, dashboard quick actions
- Extended DB schema: share_tokens, student_notes, recurrences, holidays + classes.meeting_room, students.username/password
- ReUI component registry added
- Extended server actions: auth, attendance, recurring classes, reports
- Extended types: Attendance, ClassStatus, InvoiceStatus

### `349e3bd` — feat: Google Classroom-style redesign with tabs, topics, grading, and submissions
- **Admin classroom**: Gradient banner with student name + subject, Stream|Classwork|Grades tabbed navigation (underline style), topic-based post grouping with collapsible sections, inline topic create/rename/delete, post detail pages with Instructions|Student Work sub-tabs, grading form with score + feedback + return flow
- **Student portal classroom**: Same banner, Stream|Classwork tabs (no Grades), post detail with read-only content, assignment submission form (text + optional URL), grade/feedback display with status badges (Assigned/Turned in/Graded/Missing)
- **Schema**: Added topics table, extended posts with topic_id/max_points/updated_at
- **Actions**: Topic CRUD (createTopic, renameTopic, deleteTopic), gradeSubmissionAction, addPostAttachment, deletePostAttachment, createPostAction, deletePostAction
- **Fix**: Data leakage of meeting_notes in student-facing queries (switched to explicit column lists)
- **Fix**: Added global error boundary (app/error.tsx)

### `94d9699` — feat: remove Stream tab, always-visible topic selector, new login routes
- Removed Stream tab from classroom — Classwork is now default (students get Classwork only; admin gets Classwork + Grades)
- Topic selector always visible in post creation dialog with inline "New topic" creation button (no need to pre-create topics)
- Login routes moved: `/login` → `/portal/admin`, `/portal` → `/portal/student`
- Old routes redirect to new locations
- Middleware updated for new auth paths
- Logout actions redirect to new login pages

### `d7036c8` — fix: security audit — data leakage, routing, and access control fixes
- **Data leakage fix**: Removed SELECT * from ALL student-facing pages — explicit column lists excluding hourly_rate, notes, password, meeting_notes
- **Meeting page**: meeting_notes only fetched when admin session is active, not in student RSC payload
- **Route fix**: Student post detail moved from `classroom/[postId]` to `classroom/post/[postId]` to match link pattern from ClassroomTabs basePath
- **Redirect fix**: Student leave-meeting redirect to `/portal/student/{id}` (was `/portal`)
- **Redirect fix**: Student portal layout redirect to `/portal/student` (was `/portal`)
- **Topic selector fix**: Pass topics prop to ClassroomActions in both admin classroom page and ClassworkTab (was defaulting to empty array)
- **Access control verified**: Students get 307 when trying to access /classroom, /students, /settings; no admin features in student HTML; no sensitive fields in student RSC payload

## Route Structure
- `/` — admin dashboard (rich: stats, charts, agenda, reports, invoices)
- `/students`, `/students/[id]`, `/students/[id]/edit`, `/students/new` — student CRUD
- `/schedule`, `/schedule/new`, `/schedule/recurring/new` — class scheduling (ReUI calendar)
- `/classes/[id]` — class detail with report, cancel, meeting link
- `/invoices`, `/invoices/[id]`, `/invoices/new` — invoice management with print/WhatsApp/QR
- `/classroom` — list of student classrooms
- `/classroom/[studentId]` — admin classroom (banner + Classwork|Grades tabs)
- `/classroom/[studentId]/post/[postId]` — post detail (Instructions|Student Work tabs + grading)
- `/meeting/[classId]` — full-screen Jitsi meeting room with notes panel
- `/settings` — business info, currency, payment, DuitNow QR, holidays, notifications
- `/portal/admin` — admin login page
- `/portal/student` — student login page
- `/portal/student/[studentId]` — student dashboard
- `/portal/student/[studentId]/classroom` — student classroom (Classwork tab only)
- `/portal/student/[studentId]/classroom/post/[postId]` — student post view + submission
- `/portal/student/[studentId]/schedule` — student schedule
- `/portal/student/[studentId]/profile` — student profile
- `/share/[token]` — parent share portal (read-only)
- `/share/[token]/attendance`, `/invoices`, `/invoices/[invoiceId]`, `/reports`, `/schedule`
- `/login` — redirects to `/portal/admin`
- `/portal` — redirects to `/portal/student`
- `/portal/[studentId]` — legacy route
- `/error.tsx` — global error boundary

## Conventions
- Use shadcn imports: `@/components/ui/button`, `@/components/ui/card`, etc.
- Custom wrappers: `@/components/page-header`, `@/components/empty-state`, `@/components/form-field`
- Form fields: `Field`, `TextAreaField`, `SelectField` from `@/components/form-field`
- Button variants: `default` (primary), `secondary`, `destructive`, `outline`, `ghost`
- Badge variants: `default`, `secondary`, `destructive`, `outline`
- All pages are async server components with `export const dynamic = "force-dynamic"`
- Currency: pass currencySymbol from `getSetting("currency")` to `currency()` helper
- Colors use design token classes: `text-foreground`, `text-muted-foreground`, `bg-primary`, etc.
- Student-facing queries MUST use explicit column lists — never SELECT * — exclude: hourly_rate, notes, password, meeting_notes
- Server actions pattern: `actionName()` (with redirect) + `actionNameQuick()` (without redirect, for dialogs)
- No old `components/ui.tsx` — deleted, replaced by shadcn + wrappers
