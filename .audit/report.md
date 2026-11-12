# Codebase Audit Report

**Project:** TuitionManager
**Date:** 2026-11-11
**Audited by:** Claude (codebase-audit skill)
**Scope:** Full repo — all source files
**Total files read:** 72 of ~120 source files (skipped: components/ui/ [20 shadcn stock], components/reui/event-calendar/ [~8K lines vendor], node_modules, .next, .git)
**Skipped:** node_modules/, .next/, .git/, components/ui/ (standard shadcn), components/reui/event-calendar/ (vendor ReUI)

---

## Executive Summary

38 issues found across 18 categories. **2 blockers** (hardcoded plaintext admin credentials, zero auth guards on server actions), **4 critical** issues (middleware bypasses, plaintext student passwords, predictable credentials, username collisions), and **11 high-severity** issues including data leakage through `SELECT *` on public-facing share pages, race conditions in invoice generation, and unprotected export endpoints. The single biggest risk: **any authenticated user (admin or student) can call any server action** — a student can delete other students, change settings, or grade their own submissions. Overall health: **Significant Risk**.

---

## Issue Statistics

| Severity | Count |
|----------|-------|
| Blocker  | 2     |
| Critical | 4     |
| High     | 11    |
| Medium   | 13    |
| Low      | 8     |
| **Total**| **38**|

| Category                          | Count |
|-----------------------------------|-------|
| Conflicting business logic        | 2     |
| Dead/orphaned code                | 1     |
| Copy-paste duplication            | 2     |
| Data-model / schema drift         | 2     |
| Missing/inconsistent validation   | 3     |
| Error handling gaps               | 2     |
| Race conditions / async misuse    | 1     |
| API contract mismatches           | 0     |
| State-management bugs             | 0     |
| Auth/permission gaps              | 7     |
| Secrets/config placement          | 2     |
| Env var / config mismatches       | 0     |
| Migration drift                   | 1     |
| Type-safety holes                 | 2     |
| Fragile assumptions / TODO debt   | 2     |
| Future-failure weak spots         | 3     |
| Test coverage blind spots         | 1     |
| Dependency risk                   | 0     |

| Effort       | Count |
|--------------|-------|
| Quick fix    | 12    |
| Small        | 14    |
| Medium       | 8     |
| Large        | 3     |
| Refactor     | 1     |

---

## Issue Table

| ID   | Sev      | Category                 | File(s)                          | Description (short)                              | Effort    | Conf.    | Type      |
|------|----------|--------------------------|----------------------------------|--------------------------------------------------|-----------|----------|-----------|
| A-1  | Blocker  | Auth gaps                | lib/actions.ts (entire)          | No auth guards on ANY server action              | Large     | Certain  | Mechanic. |
| A-2  | Blocker  | Secrets/config           | lib/db.ts:239-240                | Plaintext admin credentials hardcoded            | Small     | Certain  | Judgment  |
| A-3  | Critical | Auth gaps                | middleware.ts:26-36              | Middleware checks cookie existence, not validity  | Small     | Certain  | Mechanic. |
| A-4  | Critical | Auth gaps                | lib/actions.ts:59-62             | Plaintext password storage/comparison            | Medium    | Certain  | Mechanic. |
| A-5  | Critical | Secrets/config           | lib/actions.ts:77-80             | Predictable student credentials (firstName123)   | Medium    | Certain  | Judgment  |
| A-6  | Critical | Missing validation       | lib/actions.ts:82-108            | Username collision — no UNIQUE constraint         | Small     | Certain  | Mechanic. |
| A-7  | High     | Auth gaps                | lib/export.ts:19-46              | Export actions expose all data, no auth           | Quick fix | Certain  | Mechanic. |
| A-8  | High     | Auth gaps                | app/share/[token]/invoices/[invoiceId]/page.tsx:51 | SELECT * FROM students on public share page | Quick fix | Certain  | Mechanic. |
| A-9  | High     | Auth gaps                | app/share/[token]/attendance/page.tsx:25 | SELECT * FROM classes on public share page  | Quick fix | Certain  | Mechanic. |
| A-10 | High     | Auth gaps                | middleware.ts:10                 | /meeting/ is public — no auth required           | Quick fix | Certain  | Judgment  |
| A-11 | High     | Auth gaps                | middleware.ts:25-32              | Student session not validated against URL ID      | Small     | Certain  | Mechanic. |
| A-12 | High     | Race conditions          | lib/actions.ts:449-458           | Invoice number race condition                    | Small     | Certain  | Mechanic. |
| A-13 | High     | Error handling gaps      | lib/actions.ts:461-539           | Invoice generation not transactional             | Medium    | Certain  | Mechanic. |
| A-14 | High     | Conflicting logic        | lib/actions.ts:658 vs 428        | cancelClass reschedule omits meeting_room        | Quick fix | Certain  | Mechanic. |
| A-15 | High     | Auth gaps                | lib/auth.ts:27-29                | Single admin session — second login kills first  | Small     | High     | Judgment  |
| A-16 | High     | Data-model drift         | app/classes/[id]/page.tsx:52,56  | SELECT * on admin class detail leaks all fields  | Quick fix | Certain  | Mechanic. |
| A-17 | High     | Secrets/config           | app/portal/admin/page.tsx:88     | Default credentials displayed on login page      | Quick fix | Certain  | Mechanic. |
| A-18 | Medium   | Missing validation       | lib/actions.ts:970-983           | submitAssignment allows unlimited resubmissions  | Small     | Certain  | Judgment  |
| A-19 | Medium   | Missing validation       | lib/actions.ts:997-1019          | submitQuizAnswers allows unlimited resubmissions | Small     | Certain  | Judgment  |
| A-20 | Medium   | Error handling gaps      | lib/actions.ts:894               | Quiz JSON parse silent catch                     | Quick fix | Certain  | Mechanic. |
| A-21 | Medium   | Future-failure           | lib/actions.ts:843-855           | DuitNow QR stored as unlimited base64            | Small     | High     | Mechanic. |
| A-22 | Medium   | Future-failure           | lib/actions.ts:186-189           | deleteStudent cascades silently                  | Small     | Certain  | Judgment  |
| A-23 | Medium   | Data-model drift         | lib/types.ts:35                  | ClassRow.meeting_notes stale after migration     | Quick fix | Certain  | Mechanic. |
| A-24 | Medium   | Migration drift          | lib/db.ts:226                    | Legacy meeting_notes column never dropped        | Quick fix | High     | Judgment  |
| A-25 | Medium   | Conflicting logic        | lib/actions.ts:873 vs 917        | createPost vs createPostAction feature disparity | Small     | High     | Judgment  |
| A-26 | Medium   | Type-safety holes        | lib/db.ts:257-259                | rowToObject unsafe cast — no runtime validation  | Medium    | Certain  | Mechanic. |
| A-27 | Medium   | Future-failure           | lib/db.ts:250-255                | ensureMigrated() no concurrency guard            | Small     | High     | Mechanic. |
| A-28 | Medium   | Type-safety holes        | app/schedule/page.tsx:45         | `(c as any).teacher_notes` type bypass           | Quick fix | Certain  | Mechanic. |
| A-29 | Medium   | Auth gaps                | middleware.ts:12                 | /api/ is public — future routes unprotected      | Quick fix | High     | Judgment  |
| A-30 | Medium   | Auth gaps                | lib/auth.ts:54-55                | Single student session per student               | Small     | Certain  | Judgment  |
| A-31 | Low      | Copy-paste duplication   | lib/actions.ts (multiple)        | Quick/non-Quick action pairs duplicate logic     | Refactor  | Certain  | Mechanic. |
| A-32 | Low      | Dead/orphaned code       | lib/types.ts:35                  | ClassRow.meeting_notes field unused              | Quick fix | Certain  | Mechanic. |
| A-33 | Low      | Copy-paste duplication   | app/classroom + portal/classroom | POST_TYPE_CONFIG duplicated across pages         | Small     | Certain  | Mechanic. |
| A-34 | Low      | Fragile assumptions      | lib/db.ts:16                     | PRAGMA foreign_keys per migrate, not per conn    | Quick fix | High     | Mechanic. |
| A-35 | Low      | Fragile assumptions      | lib/format.ts                    | No error handling on parseISO                    | Quick fix | High     | Mechanic. |
| A-36 | Low      | Fragile assumptions      | lib/db.ts:278-284                | getSetting returns "" — can't distinguish empty  | Quick fix | Certain  | Mechanic. |
| A-37 | Low      | Fragile assumptions      | lib/actions.ts:194-198           | Math.random for meeting room names               | Quick fix | Certain  | Mechanic. |
| A-38 | Low      | Test coverage            | (entire repo)                    | Zero test files exist                            | Large     | Certain  | Judgment  |

---

## Issue Details

### A-1: No auth guards on ANY server action

**Severity:** Blocker
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Large
**Type:** Mechanical

**What's wrong:**
Every exported function in `lib/actions.ts` is a Next.js server action callable by any HTTP client with a valid session cookie. There is zero verification inside any action that the caller is an admin or the correct student. The middleware only checks cookie *existence* (not validity or role), and server actions run outside middleware entirely.

**Evidence:**
- `deleteStudent(id)` — any user can delete any student
- `deleteInvoice(id)` — any user can delete any invoice
- `saveSettings(formData)` — any user can change admin settings (business name, currency, credentials)
- `gradeSubmissionAction(...)` — a student could grade their own submission
- `createStudent(formData)` — a student-session user can create students
- `deletePostAction(postId, studentId)` — anyone can delete classroom posts

None of these functions call `verifyAdminSession()` or `getStudentSession()`.

**Why it matters:**
Any authenticated user (including students) can perform any administrative action. A student could escalate to delete all students, change the admin password, or manipulate invoices.

**Risk if left unfixed:**
Full privilege escalation. A student who discovers server action endpoints can take complete control of the application.

**Proposed fix:**
Add an `requireAdmin()` guard (calling `verifyAdminSession()`, throwing if not admin) at the top of every admin-only action. Add `requireStudent(studentId)` guard for student-scoped actions that validates the session matches the target student.

**Blast radius:**
Every server action needs modification. Group by role: admin-only actions, student-scoped actions, and public actions (login only).

---

### A-2: Plaintext admin credentials hardcoded in migration

**Severity:** Blocker
**Category:** Secrets/config placement
**Confidence:** Certain
**Effort:** Small
**Type:** Judgment — requires human decision

**What's wrong:**
`lib/db.ts:239-240` seeds default admin credentials as plaintext:
```sql
INSERT OR IGNORE INTO settings(key, value) VALUES ('admin_username', 'admin')
INSERT OR IGNORE INTO settings(key, value) VALUES ('admin_password', 'admin123')
```
The password is stored and compared as plaintext throughout the system. Additionally, `app/portal/admin/page.tsx:88` displays "Default: admin / admin123" on the public login page.

**Evidence:**
- `lib/db.ts:239-240` — seed INSERT
- `lib/actions.ts:41-52` — `loginAdmin()` compares plaintext password from form with plaintext password from settings
- `app/portal/admin/page.tsx:88` — login page shows credentials

**Why it matters:**
Anyone who visits `/portal/admin` sees the default credentials and can log in as admin.

**Risk if left unfixed:**
Unauthorized admin access. The credentials are visible to anyone who finds the login page.

**Proposed fix:**
Decision needed: (1) Hash passwords with scrypt/bcrypt and change the default, or (2) if this is intentionally a personal-use app with no public exposure, at minimum remove the credentials hint from the login page. My recommendation: Option 1.

**Blast radius:**
`loginAdmin()`, `saveSettings()` (if admin can change password), and the migration seed.

---

### A-3: Middleware checks cookie existence only

**Severity:** Critical
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Small
**Type:** Mechanical

**What's wrong:**
`middleware.ts:26-27` and `35-36`:
```js
const studentSession = request.cookies.get("student_session")?.value;
if (!studentSession) { ... redirect ... }
// and
const session = request.cookies.get("admin_session")?.value;
if (!session) { ... redirect ... }
```
Any non-empty cookie value passes. A user can set `admin_session=garbage` in their browser and access all admin routes. The actual token validation happens in page RSCs via `verifyAdminSession()`, but server actions have no validation at all (see A-1).

**Why it matters:**
Combined with A-1, this creates a complete bypass: set a fake cookie → call server actions directly → the action runs without any auth.

**Proposed fix:**
Validate session tokens in middleware by calling the DB. Alternatively, since this is edge middleware where DB calls are expensive, fix A-1 instead (auth in server actions) and accept middleware as a first-pass filter only.

**Blast radius:**
middleware.ts only. If choosing DB validation, needs async DB client in middleware.

---

### A-4: Plaintext password storage for students

**Severity:** Critical
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Medium
**Type:** Mechanical

**What's wrong:**
`lib/actions.ts:59-62`:
```sql
SELECT id FROM students WHERE LOWER(username) = ? AND password = ? AND active = 1
```
Student passwords are stored and compared as plaintext. Combined with the predictable generation pattern (A-5), this means anyone who knows a student's first name can guess their password.

**Proposed fix:**
Hash passwords with `crypto.scrypt` (available in Node.js without dependencies) on creation/update, and compare hashes on login.

---

### A-5: Predictable student credential generation

**Severity:** Critical
**Category:** Secrets/config placement
**Confidence:** Certain
**Effort:** Medium
**Type:** Judgment

**What's wrong:**
`lib/actions.ts:77-80`:
```js
function generateCredentials(name: string) {
  const firstName = name.split(/\s+/)[0].toLowerCase();
  return { username: firstName, password: `${firstName}123` };
}
```
Every student's password is `<firstname>123`. If a student knows another student's name, they can log into their account.

**Proposed fix:**
Decision needed: (1) Generate random passwords and display them once to the admin, (2) Use a different scheme (e.g., `firstName` + random 4 digits), or (3) Accept this for a personal tutoring app. My recommendation: Option 2 at minimum.

---

### A-6: Username collision — no UNIQUE constraint

**Severity:** Critical
**Category:** Missing/inconsistent validation
**Confidence:** Certain
**Effort:** Small
**Type:** Mechanical

**What's wrong:**
The `students` table has no UNIQUE constraint on `username`. If two students share a first name (e.g., "Alice Smith" and "Alice Wong"), both get username `alice` and password `alice123`. Login then returns an arbitrary match.

**Proposed fix:**
Add UNIQUE constraint on `students.username`. In `generateCredentials`, append a disambiguator if the username already exists (e.g., `alice`, `alice2`, `alice3`).

---

### A-7: Export actions expose all data without auth

**Severity:** High
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`lib/export.ts:19-46` — `exportStudentsCsv()`, `exportClassesCsv()`, `exportInvoicesCsv()` are server actions with no authorization check. The student export includes `hourly_rate`. Any authenticated user (including students) can call these.

**Proposed fix:**
Add `await verifyAdminSession()` at the top of each export action.

---

### A-8: SELECT * FROM students on public share page

**Severity:** High
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`app/share/[token]/invoices/[invoiceId]/page.tsx:51`:
```js
queryOne<Student>("SELECT * FROM students WHERE id = ?", [inv.student_id])
```
This is a public-facing page (no login required, only a share token). The full student record including `password`, `hourly_rate`, and `notes` is loaded into the server component. While these fields aren't rendered in HTML, they exist in server memory and could leak through error serialization.

**Proposed fix:**
Replace with explicit column list: `SELECT id, name, email, phone, guardian_name FROM students WHERE id = ?`

---

### A-9: SELECT * FROM classes on public share attendance page

**Severity:** High
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`app/share/[token]/attendance/page.tsx:25`:
```js
SELECT * FROM classes WHERE student_id = ? ORDER BY scheduled_at DESC
```
Leaks `meeting_room`, `meeting_notes` (legacy), `cancel_reason` to parent share view.

**Proposed fix:**
Use explicit column list excluding sensitive fields.

---

### A-10: /meeting/ is a public path

**Severity:** High
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Judgment

**What's wrong:**
`middleware.ts:10` lists `/meeting/` as a public path. Anyone with a meeting URL can access the meeting page without authentication. The meeting room names are pseudo-random but not unguessable.

**Proposed fix:**
Decision needed: (1) Remove `/meeting/` from PUBLIC_PATHS and require auth, or (2) Accept this if students/parents need meeting access without accounts. The meeting page already handles admin vs non-admin by checking the session. My recommendation: Remove from PUBLIC_PATHS — the meeting page checks auth internally and degrades gracefully.

---

### A-11: Student session not validated against URL student ID

**Severity:** High
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Small
**Type:** Mechanical

**What's wrong:**
`middleware.ts:25-32`: A student with a valid session for student ID 1 can access `/portal/student/2/...` because middleware only checks that a `student_session` cookie exists. The student portal layout does validate via `getStudentSession()` and compares the returned ID against the URL param, so the actual pages are protected. But any server action called from that page context still lacks validation (see A-1).

**Proposed fix:**
Already partly mitigated by layout validation. Full fix requires A-1 (auth guards on server actions).

---

### A-12: Invoice number race condition

**Severity:** High
**Category:** Race conditions / async misuse
**Confidence:** Certain
**Effort:** Small
**Type:** Mechanical

**What's wrong:**
`lib/actions.ts:449-458` — `nextInvoiceNumber()` reads the last invoice number, increments, and returns. Two concurrent invoice generations get the same number. The UNIQUE constraint on `invoice_number` will crash one.

**Proposed fix:**
Use a transaction with a SELECT FOR UPDATE equivalent, or catch the UNIQUE constraint error and retry with an incremented number.

---

### A-13: Invoice generation not transactional

**Severity:** High
**Category:** Error handling gaps
**Confidence:** Certain
**Effort:** Medium
**Type:** Mechanical

**What's wrong:**
`lib/actions.ts:461-539` — `generateInvoice()` creates the invoice header, then inserts items in a for-loop. If any item insert fails, you get a partial invoice.

**Proposed fix:**
Wrap the entire invoice creation (header + all items) in a Turso transaction using `client.transaction()`.

---

### A-14: cancelClass reschedule omits meeting_room

**Severity:** High
**Category:** Conflicting business logic
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`lib/actions.ts:658-661` — The reschedule INSERT in `cancelClass()` doesn't set `meeting_room`, so the rescheduled class has no Jitsi meeting link. Compare with `rescheduleClassQuick()` at line 428 which does call `generateMeetingRoom()`.

**Proposed fix:**
Add `meeting_room` to the INSERT in `cancelClass()` using `generateMeetingRoom()`.

---

### A-15: Single admin session token

**Severity:** High
**Category:** Auth/permission gaps
**Confidence:** High
**Effort:** Small
**Type:** Judgment

**What's wrong:**
`lib/auth.ts:27-29` — Only one admin session at a time. Logging in from a second device silently invalidates the first.

**Proposed fix:**
Decision needed: For a single-user app this may be acceptable. If multi-device is needed, store sessions in a separate `sessions` table keyed by token. My recommendation: Accept for now — Ananth is the only admin.

---

### A-16: SELECT * on admin class detail page

**Severity:** High
**Category:** Data-model / schema drift
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`app/classes/[id]/page.tsx:52,56,57` — Three `SELECT *` queries on an admin-only page. While admin can see all data, this violates the project's established "never SELECT *" policy and pulls stale `meeting_notes` column.

**Proposed fix:**
Replace with explicit column lists.

---

### A-17: Default credentials displayed on login page

**Severity:** High
**Category:** Secrets/config placement
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`app/portal/admin/page.tsx:88`:
```html
<p>Default: admin / admin123</p>
```
This tells any visitor the admin credentials.

**Proposed fix:**
Remove this line.

---

### A-18: submitAssignment allows unlimited resubmissions

**Severity:** Medium
**Category:** Missing/inconsistent validation
**Confidence:** Certain
**Effort:** Small
**Type:** Judgment

**What's wrong:**
`lib/actions.ts:970-983` — No check for existing submission. A student can submit multiple times, creating duplicate rows.

**Proposed fix:**
Decision needed: (1) Allow resubmission by updating the existing row (upsert), (2) Block resubmission after the first, or (3) Allow multiple submissions but only grade the latest. My recommendation: Option 1 — upsert.

---

### A-19: submitQuizAnswers allows unlimited resubmissions

**Severity:** Medium
**Category:** Missing/inconsistent validation
**Confidence:** Certain
**Effort:** Small
**Type:** Judgment

Same as A-18 but for quiz answers.

---

### A-20: Quiz JSON parse silent catch

**Severity:** Medium
**Category:** Error handling gaps
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`lib/actions.ts:894` — If quiz question JSON is malformed, the catch silently skips question creation. The post is created with no questions and the user gets no error.

**Proposed fix:**
Return an error result instead of silently continuing.

---

### A-21: DuitNow QR stored as unlimited base64

**Severity:** Medium
**Category:** Future-failure weak spots
**Confidence:** High
**Effort:** Small
**Type:** Mechanical

**What's wrong:**
`lib/actions.ts:843-855` — No file size limit on QR image upload. A large image becomes a massive base64 string in the settings TEXT column.

**Proposed fix:**
Add a size check (e.g., max 500KB before base64 encoding).

---

### A-22: deleteStudent cascades silently

**Severity:** Medium
**Category:** Future-failure weak spots
**Confidence:** Certain
**Effort:** Small
**Type:** Judgment

**What's wrong:**
`lib/actions.ts:186-189` — Due to `ON DELETE CASCADE`, deleting a student destroys all their classes, reports, invoices, submissions, quiz answers, notes, and share tokens. No soft-delete option.

**Proposed fix:**
Decision needed: (1) Add soft-delete (set `active = 0` and filter), (2) Add a confirmation step listing what will be deleted, or (3) Accept as-is. My recommendation: Option 1 — soft-delete is safer for a system with financial records.

---

### A-23: ClassRow.meeting_notes stale type field

**Severity:** Medium
**Category:** Data-model / schema drift
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`lib/types.ts:35` — `ClassRow` still declares `meeting_notes: string | null` despite the migration to the `class_notes` table.

**Proposed fix:**
Remove `meeting_notes` from `ClassRow` type.

---

### A-24: Legacy meeting_notes column never dropped

**Severity:** Medium
**Category:** Migration drift
**Confidence:** High
**Effort:** Quick fix
**Type:** Judgment

**What's wrong:**
`lib/db.ts:226` — The migration adds `meeting_notes` to classes and copies data to `class_notes`, but never drops the old column. It can accumulate stale data.

**Proposed fix:**
Decision needed: SQLite doesn't support `ALTER TABLE DROP COLUMN` easily. Options: (1) Accept the vestigial column, (2) Recreate the table without it in a future migration. My recommendation: Accept for now, note in CLAUDE.md.

---

### A-25: createPost vs createPostAction feature disparity

**Severity:** Medium
**Category:** Conflicting business logic
**Confidence:** High
**Effort:** Small
**Type:** Judgment

**What's wrong:**
`lib/actions.ts:873-875` (`createPost`) doesn't set `topic_id` or `max_points`. `lib/actions.ts:917-919` (`createPostAction`) does. Two different code paths for creating posts.

**Proposed fix:**
Decision needed: Is `createPost` still used? If not, remove it (dead code). If yes, align features.

---

### A-26: rowToObject unsafe cast

**Severity:** Medium
**Category:** Type-safety holes
**Confidence:** Certain
**Effort:** Medium
**Type:** Mechanical

**What's wrong:**
`lib/db.ts:257-259` — `row as unknown as T` provides zero runtime validation. Every query result is blindly trusted to match its TypeScript type.

**Proposed fix:**
Add a lightweight runtime check (verify expected columns exist) or accept the risk with a comment. For a personal app this is low-impact.

---

### A-27: ensureMigrated() no concurrency guard

**Severity:** Medium
**Category:** Future-failure weak spots
**Confidence:** High
**Effort:** Small
**Type:** Mechanical

**What's wrong:**
`lib/db.ts:250-255` — Two concurrent requests on cold start both enter `migrate()`. Idempotent DDL prevents crashes but wastes resources.

**Proposed fix:**
Use a promise-based guard: `let _migrationPromise: Promise<void> | null = null;`

---

### A-28: (c as any).teacher_notes type bypass

**Severity:** Medium
**Category:** Type-safety holes
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

**What's wrong:**
`app/schedule/page.tsx:45` — `(c as any).teacher_notes` bypasses TypeScript. The query at line 21-28 returns `teacher_notes` via a JOIN, but the type `ClassWithStudent` doesn't include it.

**Proposed fix:**
Extend the query result type to include `teacher_notes`.

---

### A-29: /api/ is a public path in middleware

**Severity:** Medium
**Category:** Auth/permission gaps
**Confidence:** High
**Effort:** Quick fix
**Type:** Judgment

**What's wrong:**
`middleware.ts:12` — All `/api/` routes bypass auth. No API routes exist currently, but any future API route would be unprotected by default.

**Proposed fix:**
Decision needed: (1) Remove `/api/` from PUBLIC_PATHS, or (2) Leave as-is with a comment noting API routes need their own auth. My recommendation: Remove it — re-add selectively when API routes are created.

---

### A-30: Single student session per student

**Severity:** Medium
**Category:** Auth/permission gaps
**Confidence:** Certain
**Effort:** Small
**Type:** Judgment

**What's wrong:**
`lib/auth.ts:54-55` — Each student can only have one active session. A second device login kills the first. For a tutoring app this may be fine.

**Proposed fix:**
Accept for now unless students report issues.

---

### A-31: Quick/non-Quick action pair duplication

**Severity:** Low
**Category:** Copy-paste duplication
**Confidence:** Certain
**Effort:** Refactor
**Type:** Mechanical

**What's wrong:**
`lib/actions.ts` has near-identical pairs: `createStudent`/`createStudentQuick`, `createClass`/`createClassQuick`, `generateInvoice`/`generateInvoiceQuick`, etc. Each pair duplicates 30-60 lines differing only in redirect vs return.

**Proposed fix:**
Extract shared logic into internal functions, with the public actions as thin wrappers.

---

### A-32: ClassRow.meeting_notes field unused (dead code)

**Severity:** Low
**Category:** Dead/orphaned code
**Confidence:** Certain
**Effort:** Quick fix
**Type:** Mechanical

Same as A-23 — the type field is dead code after the migration.

---

### A-33: POST_TYPE_CONFIG duplicated

**Severity:** Low
**Category:** Copy-paste duplication
**Confidence:** Certain
**Effort:** Small
**Type:** Mechanical

**What's wrong:**
`POST_TYPE_CONFIG` is defined identically in `app/classroom/[studentId]/post/[postId]/page.tsx` and `app/portal/student/[studentId]/classroom/post/[postId]/page.tsx`.

**Proposed fix:**
Extract to a shared module.

---

### A-34: PRAGMA foreign_keys per migrate, not per connection

**Severity:** Low
**Category:** Fragile assumptions
**Confidence:** High
**Effort:** Quick fix

SQLite needs `PRAGMA foreign_keys = ON` per connection. The singleton client runs it once. With Turso's managed connections this may or may not persist.

---

### A-35: No error handling on parseISO in format.ts

**Severity:** Low
**Category:** Fragile assumptions
**Confidence:** High
**Effort:** Quick fix

Invalid date strings would throw. All callers assume DB data is valid.

---

### A-36: getSetting returns "" for missing keys

**Severity:** Low
**Category:** Fragile assumptions
**Confidence:** Certain
**Effort:** Quick fix

Can't distinguish "key exists with empty value" from "key doesn't exist".

---

### A-37: Math.random for meeting room names

**Severity:** Low
**Category:** Fragile assumptions
**Confidence:** Certain
**Effort:** Quick fix

Not cryptographically secure, but for Jitsi room names the collision risk is minimal.

---

### A-38: Zero test files exist

**Severity:** Low
**Category:** Test coverage blind spots
**Confidence:** Certain
**Effort:** Large
**Type:** Judgment

No test files exist in the repo. No jest/vitest config. Critical business logic (invoicing, auth, class scheduling) has zero automated tests.

---

## Implied Spec

### Behavior-as-Implemented

1. **Admin auth**: Login with username/password checked against plaintext values in `settings` table. Session is a random hex token stored in settings and in an httpOnly cookie. One session at a time per role.
2. **Student auth**: Login with `firstName` / `firstName123` credentials. Session is `studentId:randomHex` token.
3. **Middleware**: Checks cookie existence (not validity) on protected routes. Public paths: login pages, share links, meeting rooms, API routes.
4. **Student CRUD**: Create with auto-generated credentials. Delete cascades all history. Edit updates in place.
5. **Class scheduling**: One-off or recurring (weekly/biweekly/custom). Holiday-aware generation. Cancel with optional reschedule. Meeting room is a random Jitsi slug.
6. **Invoicing**: Period-based generation. Completed + canceled classes included. Canceled = RM 0, Trial = RM 0, Rescheduled = normal rate with [RESCHEDULED] prefix. Auto-incrementing invoice number per year.
7. **Classroom (LMS)**: Per-student classrooms. Posts grouped by topics. Types: material, assignment, quiz, announcement. Assignments have submissions with grading. Quizzes have questions with auto-grading.
8. **Meetings**: Jitsi embed with scoped notes (teacher/student private). Notes auto-save every 2 seconds.
9. **Parent share**: Token-based read-only portal for attendance, invoices, reports, schedule.
10. **Settings**: Business info, currency, payment instructions, DuitNow QR, holiday management.

### Undocumented Business Rules

- Students with identical first names get identical credentials (no collision handling)
- `generateInvoiceQuick` silently skips students with no billable classes (returns early)
- Quiz answers are auto-graded by exact string match (case-sensitive for MCQ, compared against `correct_answer`)
- Meeting room names follow pattern `tuitionhub-XXX-XXXX-XXX` (3-4-3 random alpha)

### Conflicting Rules

See issues A-14 (cancelClass vs rescheduleClassQuick on meeting_room) and A-25 (createPost vs createPostAction on features).

---

## Contradiction Log

1. **meeting_notes**: ClassRow type declares it, ALTER TABLE adds it, class_notes table replaces it. Three places disagree on where class notes live.
2. **SELECT * policy**: CLAUDE.md says "never SELECT *" for student-facing queries. Multiple admin and share pages use `SELECT *` on students, classes, and invoices.
3. **cancelClass** reschedule omits meeting_room; `rescheduleClassQuick` includes it.
4. **createPost** and **createPostAction** create posts with different feature sets.
5. **Timezone**: DB defaults use UTC, dashboard uses Asia/Kuala_Lumpur, invoice year uses server-local, recurring scheduling uses local timezone interpretation.

---

## Human Decisions

[Pending — to be filled after Question Gate]

---

## Fix Summary

[Pending — to be filled after Fix Loop]
