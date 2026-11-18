# Automatic monthly draft invoices

The Vercel cron in vercel.json calls GET /api/cron/monthly-invoices daily at 15:59 UTC (23:59 Malaysia). The handler runs billing only on the last day of the Malaysian month. Delayed delivery until 00:59 on the first day is accepted for the month that just ended; all other dates return a skipped result. Vercel Hobby cron may start late within its scheduled hour, so an exact 23:59 completion cannot be guaranteed.

Set a long random CRON_SECRET in the Vercel project's Production environment before deploying. Vercel automatically includes it in the Authorization: Bearer header. Without the variable, the endpoint fails closed with HTTP503; incorrect credentials receive HTTP401. This repository change does not itself provision that production secret. Do not put the secret in source control or a public URL. Deploy the configuration to activate the scheduler. If a run fails, inspect Vercel runtime logs; retries within the accepted billing window are safe.

For each student with completed, present (or legacy attended) unclaimed lessons in that month, generation creates a draft using the same line calculations as manual generation. It includes billable history of students who have since been deactivated. Absent/cancelled/unmarked lessons are excluded. A free trial remains RM0 when included alongside paid lessons. No empty or zero-total automatic invoice is created. No student/parent notification is sent for a draft, and existing parent/student draft visibility rules continue to apply.

The whole run is one database write transaction. A monthly marker is committed with its drafts; a failed run commits neither. Duplicate or concurrent calls return alreadyProcessed without creating more invoices. Existing invoice-item claims are respected, including manual drafts created earlier. An invoice generated manually for some of the month's lessons does not prevent an automatic draft for remaining unclaimed lessons.

Automatic billing is a month-end snapshot. Attendance/report corrections after a successful run are not silently inserted into its drafts on cron replay; the administrator can use the existing manual generator for newly billable, unclaimed lessons. Existing invoices remain unchanged.

## Verification

Executed tests in tests/monthly-invoices.test.cjs use real isolated SQLite, actual migration, shared invoice generation and cron route modules. They cover Malaysia month/leap/year boundaries and delay windows; private draft status; billable lesson selection and trial/zero-month handling; inactive history; per-line currency rounding; manual claims; concurrency/replay; rollback/retry; absent/missing/wrong cron credentials. Production billing was not executed against real students.
