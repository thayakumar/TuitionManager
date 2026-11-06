# TuitionManager — Project Guide

## What This Is
Personal tuition management system for Ananth — a private tutor managing students, classes, invoices.
Built with **Next.js 14 App Router** + **Turso** (cloud SQLite) + **shadcn/ui** (base-nova style).

## Tech Stack
- **Framework**: Next.js 14 (App Router, server components, server actions)
- **Database**: Turso (libSQL) — async API via `@libsql/client`
- **UI**: shadcn/ui base-nova style + custom wrappers (page-header, empty-state, form-field)
- **Styling**: Tailwind CSS v4, LMS teal palette (oklch), Poppins + Open Sans fonts
- **Deployment target**: Vercel + Turso cloud

## Key Architecture
- `lib/db.ts` — singleton Turso client, `queryAll<T>()`, `queryOne<T>()`, `execute()`, `getSetting()` helpers
- `lib/actions.ts` — all server actions (createStudent, createClass, generateInvoice, etc.)
- `lib/types.ts` — TypeScript types (Student, ClassRow, ClassWithStudent, Invoice, etc.)
- `lib/format.ts` — currency(), fmtDate(), fmtDateTime() etc.
- `components/ui/` — shadcn components (button, card, badge, dialog, etc.)
- `components/page-header.tsx`, `components/empty-state.tsx`, `components/form-field.tsx` — custom wrappers

## Database (Turso)
- URL: `libsql://tuition-manager-ananth.aws-ap-northeast-1.turso.io`
- Tables: students, classes, reports, invoices, invoice_items, settings
- Credentials in `.env.local` (gitignored)
- All db calls are async — pages are async server components

## Invoice Logic (IMPORTANT)
- Classes present in calendar get invoiced
- Cancelled classes stay visible with strikethrough, show on invoice at RM 0.00
- Cancelling prompts for reschedule → creates new "[RESCHEDULED]" class, or just marks cancelled
- Rescheduled classes invoice at normal rate

## GitHub
- Repo: `thayakumar/TuitionManager` (GitHub account: thayakumar)
- Git user locally: ananthtigerlab

## 16-Phase Build Plan (see plan file for details)
1. ~~Design System + shadcn/ui Setup~~ ✅ COMPLETE
2. Database Schema Changes (recurrences, holidays, student_notes, share_tokens + new class columns) — NEXT
3. Cancel/Reschedule Flow
4. Recurring Class Scheduling (flexible repeat)
5. Holiday Management
6. WhatsApp Share
7. PDF Export
8. Data Export CSV
9. DuitNow QR on Invoices
10. Monthly Revenue Chart
11. Running Student Notes
12. Trial Class Flag
13. Parent Shareable Link
14. PWA Support
15. Browser Push Notifications
16. Deploy to Vercel

## Conventions
- Use shadcn imports: `@/components/ui/button`, `@/components/ui/card`, etc.
- Custom wrappers: `@/components/page-header`, `@/components/empty-state`, `@/components/form-field`
- Form fields: `Field`, `TextAreaField`, `SelectField` from `@/components/form-field`
- Button variants: `default` (primary), `secondary`, `destructive`, `outline`, `ghost`
- Badge variants: `default`, `secondary`, `destructive`, `outline`
- All pages are async server components with `export const dynamic = "force-dynamic"`
- Currency: pass currencySymbol from `getSetting("currency")` to `currency()` helper
- Colors use design token classes: `text-foreground`, `text-muted-foreground`, `bg-primary`, etc.
- No old `components/ui.tsx` — deleted, replaced by shadcn + wrappers
