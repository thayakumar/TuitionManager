# Regression Test Cases — TuitionManager UI Overhaul

## Pre-requisites
- Dev server running (`npm run dev`)
- Turso database connected with sample data (students, classes, invoices)
- Browser open at `http://localhost:3000`

---

## 1. Build & Compilation

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1.1 | Production build passes | Run `npx next build` | No errors, all routes compiled |
| 1.2 | Dev server starts | Run `npm run dev` | Server starts on port 3000 |
| 1.3 | No TypeScript errors | Check build output | Zero type errors |

---

## 2. Layout & Navigation

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 2.1 | Desktop sidebar renders | Open any page at >= 768px width | Left sidebar visible with logo, nav sections (Overview, Management, System), version footer |
| 2.2 | Sidebar active state | Click each nav link | Active link has `bg-secondary` highlight, others are muted |
| 2.3 | Sidebar logo | Check logo area | GraduationCap icon with dark bg, "Tuition Manager" title, "Personal tutoring HQ" subtitle |
| 2.4 | Mobile hamburger | Resize to < 768px | Sidebar hidden, top bar with hamburger menu appears |
| 2.5 | Mobile sheet nav | Tap hamburger on mobile | Sheet slides from left with full nav content |
| 2.6 | Font is Inter | Inspect body font-family | Inter font loaded and applied |
| 2.7 | Neutral color palette | Inspect `--primary` CSS var on `:root` | Dark gray/black value (~oklch(0.205 0 0)), no teal |
| 2.8 | Background color | Check body background | Near-white (oklch(0.985 0 0)) |

---

## 3. Dashboard Page (`/`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 3.1 | Page loads | Navigate to `/` | Dashboard renders with header, stat cards, revenue chart, tables |
| 3.2 | Stat cards | Check 3 top cards | Active students count, Upcoming classes count, Outstanding amount — all with muted icons |
| 3.3 | Revenue chart | Check chart section | Bar chart with dark bars (paid) and muted bars (outstanding), correct legend |
| 3.4 | Upcoming classes table | Check table | Shows next 5 scheduled classes with date/time, student name, duration |
| 3.5 | Needs report table | Check table | Shows classes without reports, "pending" badge in outline style |
| 3.6 | Unpaid invoices table | Check table | Shows outstanding invoices with correct badge variants (destructive for overdue, outline for draft) |
| 3.7 | "Schedule class" button | Click header action | Navigates to `/schedule/new` |
| 3.8 | Empty states | Remove all data | Each section shows appropriate "Nothing scheduled" / "All caught up" / "Nothing outstanding" messages |

---

## 4. Students Pages

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 4.1 | Students list (`/students`) | Navigate to page | Table with student avatars, name, subject, grade, rate, status badge |
| 4.2 | Avatar fallback | Check student rows | Shows initials in neutral bg |
| 4.3 | Active/Inactive badge | Check status column | Active = default (dark), Inactive = secondary (gray) |
| 4.4 | Add student | Click "Add student" → fill form → submit | Redirects to student list, new student appears |
| 4.5 | Student detail (`/students/[id]`) | Click a student | Shows contact, guardian, status cards; upcoming/past classes; invoices; running notes |
| 4.6 | Edit student | Click Edit → modify fields → Save | Changes saved, redirected back |
| 4.7 | Delete student | Edit page → Delete button | Student removed, redirected to list |
| 4.8 | Student notes | Add a note → verify appears → delete it | Note CRUD works correctly |
| 4.9 | Share token | Generate parent link → copy → revoke | Token generated, URL copyable, revocation works |
| 4.10 | Export CSV | Click "Export CSV" | CSV file downloads with student data |

---

## 5. Schedule Pages

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 5.1 | Schedule calendar (`/schedule`) | Navigate to page | Calendar widget + class list panel |
| 5.2 | Calendar dots | Check days with classes | Dots appear under dates with classes (using foreground color, not teal) |
| 5.3 | Day selection | Click a date with classes | Right panel shows that day's classes with time, student, status |
| 5.4 | Class status colors | Check dot/pill colors | Completed = dark, Scheduled = muted, Canceled = destructive |
| 5.5 | Month's classes list | Scroll below calendar | Date list with class pills, clickable to select date |
| 5.6 | Schedule class | Click "Schedule class" → fill form → submit | New class created, appears on calendar |
| 5.7 | Recurring schedule | Click "Recurring" → configure → submit | Classes generated on selected days |
| 5.8 | Trial class flag | Schedule with trial checkbox | Trial badge shows in outline style (no accent/teal) |
| 5.9 | Calendar stats | Check stats card below calendar | Shows Upcoming/Completed/Canceled counts |
| 5.10 | Export CSV | Click "Export CSV" | CSV file downloads with class data |

---

## 6. Class Detail (`/classes/[id]`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 6.1 | Page loads | Navigate to a class | Shows header with student name + datetime, status/attendance/rate cards |
| 6.2 | Attendance marking | Click Present/Late/Absent | Status updates, selected button shows default variant |
| 6.3 | Cancel class | Click "Cancel class" → fill reason → submit | Class marked canceled, optional reschedule |
| 6.4 | Cancel with reschedule | Cancel + check reschedule + set date | Original canceled, new class created |
| 6.5 | Post-class report | Fill report form → save | Report saved, fields persist on reload |
| 6.6 | Edit class details | Modify date/duration/subject → save | Changes persist |
| 6.7 | Delete class | Click "Delete class" | Class removed, redirect to schedule |
| 6.8 | WhatsApp share | Click WhatsApp button (when report exists) | Opens WhatsApp with report text |
| 6.9 | Canceled class styling | View a canceled class | Title has line-through + opacity |

---

## 7. Invoice Pages

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 7.1 | Invoices list (`/invoices`) | Navigate to page | Stat cards (Outstanding, Paid This Month, Total) + invoice table |
| 7.2 | Stat card values | Check amounts | Correct calculations for outstanding and paid this month |
| 7.3 | Invoice status badges | Check badge variants | paid=default, overdue=destructive, sent=secondary, draft=outline |
| 7.4 | Generate invoice | Click "Generate invoice" → select student + period → submit | Invoice created with line items from classes |
| 7.5 | Invoice detail (`/invoices/[id]`) | Click an invoice | Shows business info, bill-to, line items table, total, notes, payment instructions |
| 7.6 | Status update | Click status buttons | Invoice status changes (active button shows default variant) |
| 7.7 | Cancelled class line items | Check a class marked cancelled on invoice | Shows with line-through + muted text, amount = 0.00 |
| 7.8 | Print / PDF | Click "Print / PDF" | Browser print dialog opens, sidebar hidden, clean print layout |
| 7.9 | DuitNow QR | Invoice with QR set | QR image shows in invoice detail |
| 7.10 | Delete invoice | Click "Delete invoice" | Invoice removed, redirect to list |
| 7.11 | WhatsApp share | Click WhatsApp button | Opens WhatsApp with invoice summary |
| 7.12 | Export CSV | Click "Export CSV" on list page | CSV downloads with invoice data |

---

## 8. Settings Page (`/settings`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 8.1 | Business details form | Fill fields → save | Settings persisted, appear on invoices |
| 8.2 | Holiday management | Add holiday → verify in list → delete | CRUD works, holiday appears/disappears |
| 8.3 | DuitNow QR upload | Upload image → verify display → remove | Upload shows preview, remove clears it |
| 8.4 | Notification toggle | Click enable | Browser permission dialog appears |
| 8.5 | File upload button styling | Check file input | Dark bg button (foreground color), not teal |

---

## 9. Parent Share Page (`/share/[token]`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 9.1 | Valid token | Open share URL with valid token | Shows student name, class history with reports, invoices |
| 9.2 | Invalid token | Open with invalid token | 404 page |
| 9.3 | No sidebar | Check layout | No navigation sidebar, standalone page |
| 9.4 | Class history cards | Check class entries | Correct status badges, report details shown when available |
| 9.5 | Invoice list | Check invoices section | Shows invoice numbers, periods, amounts, status badges |

---

## 10. Visual Consistency

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 10.1 | No teal anywhere | Inspect all pages | Zero teal/green accent colors — everything neutral/monochrome |
| 10.2 | No Poppins/Open Sans | Inspect fonts | Only Inter font family used |
| 10.3 | Card borders | Check all cards | Subtle ring-1 border (ring-foreground/10), rounded-xl |
| 10.4 | Button variants | Check all button types | default=dark, secondary=light gray, outline=border, destructive=red tint, ghost=transparent |
| 10.5 | Badge variants | Check all badge types | default=dark, secondary=gray, destructive=red tint, outline=border |
| 10.6 | Separator lines | Check page headers | Clean neutral separator after titles |
| 10.7 | Empty state borders | Check empty states | Dashed border, neutral bg |
| 10.8 | Hover states | Hover over interactive elements | bg-secondary/50 or similar neutral hover, no teal highlight |
| 10.9 | Print styles | Print any page | Sidebar hidden, clean layout, no colored elements |
| 10.10 | Mobile responsive | Resize all pages to 375px | All content fits, no horizontal scroll, hamburger nav works |

---

## 11. Data Integrity (Non-UI)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 11.1 | Currency formatting | Check amounts across pages | Correct symbol + formatting |
| 11.2 | Date formatting | Check dates across pages | Consistent format |
| 11.3 | Server actions | Submit all forms | Actions execute correctly (create, update, delete) |
| 11.4 | Database queries | Navigate all pages | No SQL errors, correct data displayed |
