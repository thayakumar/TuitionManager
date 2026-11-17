# Reschedule and invoice visibility changes

- Parent schedule now offers the existing three-choice reschedule dialog using an active scoped bearer credential. Token and student state are validated within the write transaction; client-supplied student ID does not determine ownership.
- Student and parent requests share pending-request uniqueness, future-time validation, unchanged-original semantics and tutor/student notifications.
- Admin approval allows a requested slot or their own date/time. All choices use the existing clash-checked atomic replacement path, preserving owner, duration and trial status.
- Parent invoice lists, dashboard previews, outstanding total and direct detail access exclude draft status. Other statuses remain visible. Draft generation/status changes no longer send an invoice-available notification; visible status changes still notify.
- Existing student portal has no invoice listing/detail route.

## Evidence

Executed: TypeScript check passed. Two real-module SQLite regressions passed: parent ownership/forged ID/revoked link/duplicate request/tutor custom time/trial preservation, and draft notification privacy then visible-status notification. Complete suite initially found an unrelated mock-loader failure after new TableExplorer import; table owner is updating the fixture. Five shared-build browser checks passed against isolated fake data on port 4630: parent request dialog and pending state; tutor custom calendar/time approval with trial preserved and student notification; draft invoice list/dashboard/direct-access denial while sent/paid/canceled remain visible; parent mobile dialog fits; no runtime exceptions. Evidence is in reschedule-browser-results.json and parent-reschedule-dialog.png, admin-custom-reschedule.png, parent-reschedule-mobile.png. Initial direct-access assertion expected HTTP 404; Next streamed the denial page with HTTP 200. Corrected the assertion to verify the actual not-found page and absence of invoice content; no application fix was required.
