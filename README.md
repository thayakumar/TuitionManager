# TuitionHub

Personal tuition management with admin, student and read-only parent views. Next.js 15 App Router, React, TypeScript, Tailwind v4 and libSQL/Turso; local development uses a SQLite file.

## Develop locally

Use Node.js 24 and npm 11. From this existing checkout:

```bash
npm ci
mkdir -p data
cp .env.example .env.local
npm run migrate
npm run dev
```

Open the local app on port3000. Fresh local databases seed `admin` / `admin123`; student credentials are generated when the tutor creates the student. Keep real credentials out of tracked files. For Turso, configure the existing database URL/token through environment settings instead of copying live data into a test database.

```bash
npm test
npm run typecheck
npm run build
npm run start
```

`npm run migrate` applies the reviewed schema version. A fresh process also checks the schema version safely on its first database call; concurrent initialization shares one promise, and prepared databases avoid repeated DDL. Migration preserves historical submissions as versioned attempts. Live server processes must restart in a new environment/task.

## Workflows

- Present, Absent (last-minute/no-show), and advance Cancelled are distinct. Attendance percentage is Present ÷ (Present + Absent), excluding canceled/unmarked lessons. Legacy Late records display/count as Present; new Late marks are not accepted.
- Invoice only attended completed lessons, once. Canceled and absent lessons are omitted. Rescheduled lessons become billable when marked Present; free trials remain free when moved. Lines show Malaysia date/time and duration.
- Financial History attributes revenue to the invoice's billing month, with Paid and Outstanding separately; canceled invoices do not contribute.
- Student resubmissions append history. Only the latest attempt can be graded; older work/grades stay read-only.
- Recurring lessons generate through31December of the chosen start year by default. Manage series to stop future lessons while preserving history, or extend another year. Holidays and browser reminders were removed by user decision.
- Every relevant lesson/classroom/grade change creates scoped in-app notifications. Circular badges show true unread counts; opening or marking messages read refreshes the count.
- Parent class reports are a compact expandable table. Parent links can be revoked.

See [the current role/page capability guide](docs/USER-CAPABILITIES-AND-TEST-GUIDE.md), [manual test worksheet](docs/BUSINESS-USE-CASE-WORKSHEET.csv), and [.audit/runs](.audit/runs) for the audit and implementation evidence.

## Optional integrations

Attachment uploads use `APPS_SCRIPT_UPLOAD_URL` and require an authenticated admin/student. The image/PDF limit is4MB to fit the deployment request limit. Video can use free Jitsi or configured JaaS (`JAAS_APP_ID`, `JAAS_API_KEY_ID`, `JAAS_PRIVATE_KEY`); JWTs are scoped to the authorized room. External upload/video services are optional for local work and require separate live verification.

The small vendored shadcn Tailwind utility stylesheet is retained in `styles/shadcn.css` with its MIT license, avoiding a runtime dependency on the unrelated CLI toolchain. Dependency overrides pin PostCSS to its patched8.x release; `npm audit` was clean at verification time.

## Repository work

Use the existing checkout; cloud tasks are already isolated. Do not create a Git worktree unless explicitly requested. Do not push `main` casually: the repository is connected to a Vercel deployment. The reviewed changes here are local until a separate push/deployment instruction.

## AI agent connection (MCP)

Open **Settings → AI connections** to create/revoke a key or authorize an OAuth client. The server is `/api/mcp`. See [Hermes and other agent setup](docs/MCP-SETUP.md) for HTTP, OAuth and stdio instructions and the full admin tool workflow.

## Documents and spreadsheets

The Documents library uses the pinned CasualOffice Docs and Sheets editors with TuitionHub student access and automatic saving. Live collaboration is disabled; one active editor prevents overwrites. See [Documents guide](docs/DOCUMENTS.md) for lesson linking, storage, builds and permissions.
