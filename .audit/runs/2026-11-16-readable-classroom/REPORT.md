# Readable reports, searchable classwork and relevant timelines

## Audit scope

This review follows the supplied screenshots and the requested admin/student/parent tasks. The accepted red/orange identity and larger type remain. The visual direction is quiet labels, strong values, compact decision-focused layouts and explicit state feedback. Source baseline: `cb6df03`.

## Findings and corrections

| # | Observed problem | Runtime owners and evidence | Correction | Confidence |
|---|---|---|---|---|
| 1 | Expanded report labels compete with their values; bare ratings are easy to miss. | `components/report-row.tsx`, `components/parent-report-table.tsx`; supplied screenshots. | Shared semantic report details, neutral 15px labels, darker 19px values, prominent oval rating badges in admin and parent views, including mobile. | High: rendered and measured. |
| 2 | Stream/Classwork have no way to find a post among existing material. | Both classroom routes import `components/classroom/classroom-tabs.tsx`; Graphify extracted this shared ownership. | Same search in both roles and tabs; title, body, type and topic matches, case/accent normalization, live counts, clear action and distinct empty results. | High: browser executed. |
| 3 | Classwork lacks manual post placement and stable ordering. | Shared classroom renderer and `lib/actions.ts`; posts previously had no ordering field. | Native desktop drag, move dialog, topic/position selection, persistent same-topic and cross-topic ordering. Students receive the saved organization and a notice, without organizer permissions. | High: native drag and real database assertions. |
| 4 | Student metrics inherit tall generic cards; the next lesson is repeated and an empty upcoming panel adds whitespace. | Student dashboard and generic `.metric-card` sizing. | Dedicated compact metrics, larger values, next lesson first, no duplicate preview or redundant one-lesson empty panel, responsive recent/upcoming layout. | High: desktop/mobile render and dimensions checked. |
| 5 | Future attendance rows and future marks contaminate historical views; Schedule mixes upcoming and past. | Parent attendance/schedule queries, dashboard and admin summary queries. | Attendance rows/statistics use elapsed instants only; parent Schedule shows upcoming scheduled lessons only. Related attendance summaries use the same cutoff. Admin Past Classes now also excludes future records. | High: real SQL route regressions and browser checks. |

No user research or measured token-saving percentage is claimed. These are source-supported expert findings, supplied screenshot evidence and executed checks.

## Interaction contract

- Search stays within the current student's classroom and persists between Stream and Classwork. Empty searches can be cleared. Grades remains a separate complete view.
- Admins can drag a post before another post or to the end of a topic. The Move post dialog also supports No topic and an explicit insertion point. On mobile, use the move button/dialog.
- Search covers all topics; drag is disabled while filtering, with an explanation. The move dialog can still select a complete destination list.
- Move cancellation changes nothing. Pending moves disable repeat actions. Server errors remain visible; success appears after confirmation. Other students' posts/topics cannot become destinations.
- Movement updates topic/order without replacing post IDs, attachments, submissions, grades or version history. No-op placement does not create another notification.
- Parent attendance excludes future records even when accidentally pre-marked. Parent Schedule excludes past, cancelled and completed records. Both have task-specific empty states.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Automated business/security/route tests | **34 passed**, 0 failures | [tests.txt](tests.txt) |
| Targeted browser UX checks | **18 passed**, no unhandled errors | [browser-results.json](browser-results.json) |
| General role/page/mobile checks | **38 passed**, no unhandled errors | [general results](general-pages/browser-results.json) |
| Production build and TypeScript | Passed | [build.txt](build.txt) |

Tests used fake local records in an isolated production build. They exercised native dragging within and across topics, moving a graded post while checking its retained grade and versions, no-topic movement, reload persistence, cancellation, search by title/body/topic, accent/case handling, empty results, student isolation, role controls, desktop/mobile layouts, ratings and measured label/value hierarchy.

One first attendance assertion ran before streamed content finished and inspected the loading skeleton. The corrected readiness-aware check passed; [original results](original-browser-results.json) and [retest](attendance-retest.json) are retained. No application failure was hidden by that retest.

The additive schema-3 migration introduces post ordering. A dedicated test upgrades a prepared schema-2 database and verifies that historic grading snapshots are not backfilled or rewritten. Turso's prohibition on PRAGMA version writes remains covered; version tracking stays in the settings table. Cold prepared databases still use one version read with no migration writes.

Native touch dragging, every browser/device combination, live file uploads and external video/printing were not exercised. Mobile organization uses the tested Move post dialog. Production records were not used for mutation testing.

## Requested skills and tools

- [Superior UX](https://www.skills.sh/kodekateam/superior-skills/superior-ux): experience contracts, relevant records, recovery and cross-role continuity.
- [Superior UI](https://www.skills.sh/kodekateam/superior-skills/superior-ui): hierarchy, content-led density, components and comparison with supplied evidence.
- [Superior UI Audit](https://www.skills.sh/kodekateam/superior-skills/superior-ui-audit): five evidence-backed findings before the authorized implementation phase.
- [Graphify](https://github.com/Graphify-Labs/graphify): CLI `graphifyy 0.9.111`, isolated Python environment, code-only AST extraction with `GRAPHIFY_BACKEND=none`. Initial pass indexed 208 code files; refreshed graph had 1,247 nodes and 4,971 edges. Extracted imports/calls guided ownership checks; [initial classroom map](graphify-classroom.txt). No LLM backend was enabled, no hooks were installed, and no app runtime dependency was added. Local graph: `/workspace/scratch/ux-resources/map/graphify-out/graph.json`.
- [Caveman](https://github.com/JuliusBrussee/caveman): concise chat reporting. Project documentation/comments retain normal technical prose.

## Previews

- [Report details close-up](report-detail-closeup.png)
- [Parent report and rating](parent-report-expanded.png)
- [Classroom search](student-classroom-search.png)
- [Classwork after native dragging](classwork-after-drag.png)
- [Move dialog](move-post-dialog.png)
- [Mobile move dialog](move-post-mobile.png)
- [Student dashboard](student-dashboard.png)
- [Student dashboard mobile](student-dashboard-mobile.png)
- [Past attendance](parent-attendance.png)
- [Upcoming schedule](parent-schedule.png)

The [role/page guide](../../../docs/USER-CAPABILITIES-AND-TEST-GUIDE.md) and [manual worksheet](../../../docs/BUSINESS-USE-CASE-WORKSHEET.csv) now contain 75 capabilities, including search, organization and the separate parent timelines.
