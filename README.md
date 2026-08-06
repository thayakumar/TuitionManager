# Tuition Manager

A personal tuition management system — schedule classes, track attendance, write post-class reports, and generate invoices. Runs locally with SQLite; no cloud, no accounts.

## Features

- **Students** — roster with contact info, guardian details, hourly rate, notes
- **Schedule** — book classes with date, duration, subject, location
- **Attendance** — mark present / late / absent per class
- **Post-class reports** — topics covered, homework, strengths, areas to improve, rating, next focus
- **Invoices** — auto-generate from completed classes in any date range; print or save as PDF
- **Dashboard** — upcoming classes, reports pending, outstanding invoices at a glance
- **Settings** — business name, contact, currency, payment instructions

## Tech

- Next.js 14 (App Router) + TypeScript
- SQLite (via `better-sqlite3`)
- Tailwind CSS
- Server actions — no separate API layer

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

The database lives at `data/tuition.db` (created on first run, git-ignored).

## Build

```bash
npm run build
npm run start
```

## Print / PDF

The invoice detail page has a Print button that uses the browser's built-in print → save-as-PDF. Sidebar and action buttons hide automatically in print mode.

## Data

Everything is a single SQLite file at `data/tuition.db`. Back it up by copying the file.

## Roadmap

- Recurring class templates
- CSV export of reports
- Email invoices directly
- Multi-currency
