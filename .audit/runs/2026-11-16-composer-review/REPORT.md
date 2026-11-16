# Form, popup and lesson-status review

The earlier walkthrough checked opening the calendar dialog and submitting lessons, but did not establish that its native date/time picker worked well through pointer interactions. The user's screenshot showed the old flat form. This revision rebuilds the actual form compositions and controls, retaining the approved red/orange identity and readable typography.

## What changed

**Lesson planning:** one shared composer now powers the dashboard popup, the calendar popup shown in the user's screenshot, and the full scheduling page. It has a student section, a date/time section, selectable duration cards and a clear trial toggle. Subject and Location are removed. New lessons offer **1 hour, 1.5 hours, or 2 hours** only. Historical durations are retained in the edit form until an explicit length change is selected.

**Date and time:** an in-app calendar replaces the native datetime-local widget. Start time has separate hour/minute/AM–PM controls, stored in the same MYT-based action payloads. The same controls serve replacement lessons, recurring schedules, reschedule preferences, assignment deadlines and invoice periods. Date layouts respond to the form column's available width. Calendar Escape closes the picker before closing the dialog; noon and midnight conversions were checked.

**Dialog layout:** long editors keep their header and action bar visible while their content scrolls. On mobile, duration choices become full-width rows. Form labels now have unique IDs, preventing a modal label from focusing a background field with the same name.

**Structural editors:** student details are grouped into learning profile, contacts, optional details and access; reports group lesson recap, progress and next steps; invoices have a billing editor and rule summary; posts separate content from topic/deadline/points; submissions have answer/file/link sections; grading has score and feedback sections. Recurring schedules use weekday chips and a conditional custom interval. Reschedule decisions, topic management, parent-link revocation and destructive actions use app dialogs rather than browser confirmations.

**Lesson colours:** one shared presentation helper applies Scheduled **blue**, Absent **red**, Cancelled **grey**, and Present/completed green. Cancelled takes precedence over stale attendance. Colours are applied to calendar events, badges, lesson details, student history and both portals; the admin calendar includes a legend.

## Executed results

| Suite | Result | Evidence |
|---|---|---|
| Focused form/dialog interactions | **56 passed** | [Consolidated results](results.json), [targeted retests](targeted-results.json) |
| General role/page/mobile walkthrough | **38 passed**, no unhandled browser errors | [Results](general-pages/browser-results.json) |
| Automated business/security regressions | **31 passed**, zero failures | [Log](tests.txt) |
| Production build and TypeScript | Passed | [Log](build.txt) |

These are local production-build browser checks using isolated fake records. Desktop, mobile (390 × 844) and smaller desktop (1024 × 768) layouts were exercised. Final targeted checks used the last production build; the general page run checked all three roles.

The exact screenshot flow was exercised with actual calendar-day clicks, time selects and duration-card clicks. Saved database values were checked for **60, 90 and 120-minute lessons**, including MYT-to-UTC conversion and student/parent schedule visibility. An overlapping booking was rejected and retained the chosen inputs. Blank student selection was blocked. Additional submissions created and edited a fake student, updated a report visible to the parent, submitted a reschedule request, and created/renamed/deleted an empty topic.

## Popup coverage

| Surface | Checked interaction |
|---|---|
| Dashboard/calendar/full-page lesson planner | Date selection, time selection, all three lengths, saving, overlap error, mobile controls/action bar |
| Recurring planner and full page | Weekday controls, custom interval visibility, first/last date calendars, no Subject/Location |
| Calendar lesson details | Correct status badge and real lesson details |
| Calendar cancellation/replacement | Confirmation, keeping the original, replacement calendar and time controls |
| Calendar drag confirmation | Drag opens the confirmation; cancelling preserves the original booking |
| Student Add/Edit | Open/close, sectioned layout, successful create and save, mobile action bar |
| Lesson report | Prefill, label focus, save and parent reflection, mobile layout |
| Invoice generation | Editor/summary layout, both period calendars on desktop/mobile, action access |
| Invoice cancellation | Review and cancel the confirmation without altering the invoice |
| Material/assignment/announcement editors | Open all three, deadline calendar, mobile assignment editor |
| Post edit/delete | Correct prefill and explicit deletion consequences; cancel leaves the post intact |
| Topic create/rename/delete | Modal controls and successful operations on an empty fake topic |
| Student reschedule request | Preference date/time controls and successful request submission |
| Request approval/rejection | New-time selection and review/cancel in both decision dialogs |
| Parent-link revocation | Review/cancel; existing link remains active |
| Clipboard denied | Manual-copy dialog contains the correct link |
| Recurrence stop/extend | Review/cancel in both confirmation dialogs |
| Submission and grading | Rebuilt work/history and latest-grade forms rendered; business rules also covered by regression suite |

## Observations and corrections

The first harness checked dialog disappearance before its close animation finished and used outdated labels for replacement/deadline controls. Those selectors were corrected and retested. A request test initially selected a fixture lesson that already had a pending request; the application correctly rejected it. The successful request retest selected an eligible lesson.

One local topic-rename attempt encountered `SQLITE_BUSY` while the external verification reader polled the same SQLite file during a write. The fixture was switched to WAL and subsequent assertions awaited the UI's action completion; the complete create/rename/delete journey passed. This fixture adjustment was not a production database change. [Original observations](initial-observations/full-run-original.json) remain available alongside final results.

During visual review, the invoice's date fields were too narrow and the action bar could initially fall below the viewport. The invoice editor was widened, date columns now stack when needed, and the action bar stays visible. The final targeted tests exercised invoice, recurrence and assignment calendars in desktop and mobile layouts.

No real uploads, Google storage/video calls, physical printing or exhaustive browser/device combinations were tested. Historical business scenarios are documented in the [capability guide](../../../docs/USER-CAPABILITIES-AND-TEST-GUIDE.md). Browser scripts here require the isolated fixture and the environment's Playwright runtime; they must not be pointed at production for mutation testing.

## Previews

- [Calendar planner: replacement for the supplied screenshot](calendar-planner-desktop.png)
- [Mobile planner and action bar](planner-mobile-footer.png)
- [Mobile calendar](planner-mobile-calendar.png)
- [Invoice editor](invoice-generate-desktop.png)
- [Student editor](student-edit-desktop.png)
- [Report editor](report-desktop.png)
- [Post editor](post-assignment.png)
- [Reschedule decision](request-approve.png)
- [Lesson status colours](calendar-status-colors.png)
