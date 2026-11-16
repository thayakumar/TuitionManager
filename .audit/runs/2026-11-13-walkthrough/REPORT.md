# Business walkthrough, UI and performance results

13 November2026 · current app commit `d8a74b5b843705a2636716a2244ea49b34c292d4`. Main deliverable: [role/page capability guide](../../../docs/USER-CAPABILITIES-AND-TEST-GUIDE.md).

## What was requested

The user clarified business use cases and ripple effects, not a generic textbox validation matrix. The guide therefore lists numbered **As a role I can action → result** capabilities and follows source records into other roles' pages, notifications, reports and month-end invoices. There are **109 worksheet entries**, plus14 connected business journeys. Entry granularity varies: a page capability can contain several alternative business states. This is not a count of all conceivable permutations.

## Executed check results

Across root navigation/export/mobile, administrator roster/classroom, student/parent controls, coordinated actor lifecycles and final report/settings/holiday journeys: **88 explicit checks — 75 PASS, 12 FAIL, 1 BLOCKED**. These checks include UI state checks; they are not all full business journeys. Calendar has an additional separate observation log (navigation, creation, attendance, gestures, invoice status/export/print/delete, request approval/rejection); its raw observations are not counted as automatic passes because some records only say Executed. Known failed business outcomes below are included regardless of which log proved them.

Browser tests used local Next production build, real server actions and isolated SQLite with fake students. Existing screens/records were reloaded and DB persistence checked in important workflows. Separate student and parent sessions verified approval/rejection and returned grade/feedback. Real file storage/video/messaging/payment were not invoked. Upload service responses were stubbed; print invocation was intercepted. No source fixes, commits, pushes or deployments.

## Successful connected journeys

1. Admin adds/edits a fake student → roster/profile persisted; credentials copied; schedule/classroom directories can use the student.
2. Admin creates/deletes an administrative note → list/search/expand and reload agree; no classroom report is created by an administrative note.
3. Admin generates parent link → parent sees intended student; revocation makes old link404.
4. Student requests new time → pending admin request, unchanged original booking until approval.
5. Admin approval → canceled original + one replacement with correct owner/duration; student notification and student/parent schedules agree after reload. Replayed approval remains a separate failed alternate branch from earlier module tests.
6. Admin rejects with note → student receives rejection/note and View opens own schedule.
7. Student submits content → one saved record, tutor can review; tutor returns grade/feedback → student sees the same grade, feedback/date and Graded state.
8. Admin saves post-class report → stored topics/homework and parent report agree; non-canceled class completed.
9. Admin saves temporary business name → settings and parent branding agree; original setting restored afterward.
10. Admin adds fake holiday and creates short Friday series → holiday date skipped, adjacent included date created. Fake holiday removed; room/attendance defaults still fail the intended lesson-readiness requirement.
11. Calendar Month/Week/Day/5days/Agenda and today/prev/next navigation work; normal lesson detail and attendance buttons execute.
12. Ordinary one-class RM80 invoice generation, five status buttons, exports, print invocation, Student link and own invoice deletion execute. Financial alternate paths remain failing—do not call billing fully passed.
13. Admin/student login/logout and basic role navigation work in their normal cases. Forged-cookie/foreign-object security tests in earlier audit still fail.

## Confirmed business/UI failures

|Case|Observed|Consequence|
|---|---|---|
|Cross-student post|Alice can load Bob post through own URL|Private learning material exposed|
|Duplicate pending request|Multiple pending requests for same class accepted|Admin can process conflicting requests/replacements|
|No resubmit control|First submitted view removes form|Agreed latest-replaces workflow inaccessible|
|Unsafe submission link|javascript scheme stored through UI|Unsupported/dangerous link can be presented; test never executed it|
|Grade above maximum|999/100 accepted and persisted|Invalid evaluation visible to student|
|Inline topic creation|New topic missing from still-open selector|Post can land under No topic despite success toast|
|Quick report edit|Existing saved topics absent from quick dialog|Saving can overwrite existing report fields with blanks|
|Cancel/trash ambiguity|Calendar Delete actually cancels and opens reschedule|User cannot predict historical effect|
|Canceled attendance correction|Late on canceled lesson changes it to completed|Cancellation can be unintentionally reversed|
|Drag/resize/range integration|Actual drag does not persist; range drag opens no create dialog|Visible gestures imply actions that do not happen|
|MYT time and billing dates|16:00 entry stored16:00Z; month defaultsOct31–Nov29; period end can showDec1|Wrong appointment time/month-end selection|
|Invoice status filters|Draft badge click leaves all statuses in table|Misleading navigation/control|
|Business-error feedback|Duplicate/no-lessons/reversed-period invoice errors show generic production message|User cannot tell why billing failed|
|Mobile drawer|Admin/student/parent destination loads beneath still-open menu|New page appears obscured|
|Mobile layout|At390px, students document394px and invoices418px|Page controls/content overflow intended viewport|

Prior confirmed module/business failures remain: concurrent double billing; canceled/absent invoice policy violation; parent canceled-debt sum; repeated approvals; trial flag loss; recurrence deletion history; recurring Present/no-room defaults; anonymous inbox/request/upload access. See prior [audit](../2026-11-12/report.md) for detailed file references. This UI extension does not erase those results.

## Blocked and unrun

One admin post-delete browser case remained blocked by the test selector; it is not marked product failure or passed. Some settings QR/reminder permission and live meeting/notes delay paths were only traced. Long busy-day overflow, complete recurrence frequency/date/holiday permutations, every post-delete cascade, every retrospective financial edit, all browser engines and every full cross-role stale-tab state were not executed. A temporary local server hang interrupted early runs; process restart restored service, cause unknown. Those timeouts/harness corrections were excluded from final product outcome counts. No authenticated production destructive or mutation test was performed.

## Slowness investigation

[Detailed performance evidence](PERFORMANCE.md): each cold worker executes20 migration client calls/63 SQL statements; concurrent first reads duplicate migrations; warm dashboard11 database calls across4 sequential waves. Real source/module counts are measured. Synthetic30ms-delay timings are explicitly not production timings. Public production login pages measured0.23–0.40s in repeated samples; an initial root+redirect sample2.86s. Without production authenticated request traces/region/DB RTT, exact production causal share remains unknown. Proposed order: versioned/single-flight migration, bulk settings/parallel reads, transactional batched writes, correct loading/pending feedback, then query/index/region tuning measured against actual metrics.

## Visual redesign

[Prototype](ui-redesign-proposal.html), [desktop screenshot](ui-proposal-desktop.png), [mobile screenshot](ui-proposal-mobile.png). Reference inspected: `thayakumar/daily-journal-habit-tracker`, especially workspace/ui.tsx and Workspace.tsx. Proposed white/slate canvas, rose actions/selection, restrained orange brand accent, rounded cards, larger touch targets and compact role-relevant next steps. Fix mobile header stacking/drawer close, real filters, explicit Cancel versus Delete, route skeletons and meaningful action outcomes as part of redesign. Prototype role controls are for comparing sample role screens only; no permission switch is proposed in the real app.

Prototype interaction/390px overflow check passed; production application styling remains unchanged. Source fixes and rollout still require review of concrete audit fix scope under the invoked audit skill. User policy/style directions are recorded, not treated as approval to deploy.
