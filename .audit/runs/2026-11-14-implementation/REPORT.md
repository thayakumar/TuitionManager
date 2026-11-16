# Approved repair and verification report

Implementation and local verification are complete. Nothing was committed, pushed or deployed; the live Vercel site is unchanged. This directory continues the November 12 audit and November 13 business-policy walkthrough; the final evidence was consolidated on November 16, 2026 (Malaysia time). Earlier reports describe the pre-repair application and must not be read as current failures.

## Your capability and testing manual

[Current user guide](../../../docs/USER-CAPABILITIES-AND-TEST-GUIDE.md) contains 71 numbered capabilities, grouped by role and page, and 12 connected business journeys. Each describes the action and expected result, including dependent screens and history. [The worksheet](../../../docs/BUSINESS-USE-CASE-WORKSHEET.csv) provides a reusable manual testing checklist. Catalogued capabilities are not a claim that every permutation was browser-tested.

## Implemented changes

| Area | Result |
|---|---|
| Attendance and invoices | Present, Absent and Cancelled replace Late. Absent and cancelled lessons are free and omitted. An attended rescheduled lesson is billed exactly once. Trial lessons remain free after moving. Invoice lines show date, time and duration, without subject names. |
| Scheduling | Confirmed calendar drag/resize, tutor-wide overlap checks, recurring lessons through the start year's December 31 by default, and series management. Stopping a series cancels future lessons while preserving history. Holiday and browser-reminder features removed. |
| Student work | Resubmissions append new versions. Previous work, grades and feedback remain visible. Only the newest version is gradable; a new pending version does not inherit the old grade. |
| Financial history | Separate page with charts, period filters and monthly paid/outstanding totals. Revenue belongs to the invoice billing month, regardless of payment date. Cancelled invoices are excluded. |
| Notifications | Edited posts and relevant student changes create in-app notifications. Circular numeric unread badges, open-and-mark-read and explicit mark-read actions work. |
| Parent reports | Compact report table with expandable rows, initially collapsed. |
| Access and data integrity | Private pages verify sessions and ownership on the server. Deactivated students lose access. Student tokens are hashed; uploads and meetings enforce scope. Transactional writes, duplicate/stale request protections and versioned migrations protect dependent data. |
| Interface | Purple educational visual style, responsive navigation, functional invoice filters, clearer action labels, loading/error/busy states and serialized note saving. |
| Platform | Next.js upgraded and vulnerable dependencies patched. Official shadcn CSS is vendored with its MIT license under styles/, without the unused CLI dependency. |

Your final cancellation decision is applied: **cancelled lessons do not appear on invoices**. Earlier suggestions about retaining a cancelled line are superseded.

## Executed verification

| Check | Observed result | Evidence |
|---|---|---|
| Automated regression suite | 30 passed, 0 failed | [Test log](unit-tests.log) |
| TypeScript | Passed | [Typecheck log](typecheck.log) |
| Next production build | Passed | [Build log](build.log) |
| Dependency audit | 0 reported vulnerabilities at verification time | [Audit JSON](npm-audit-final.json) |
| Local production-build browser journeys | 29 unique checks passed; no unhandled browser page errors | [Consolidated results](scenario-results.json) |

The browser checks used separate admin/student/parent sessions and isolated fake SQLite data. They executed login and access-denial cases; blank assignment submission; first, second and third submission/grade history; stale and excessive grade rejection; post-edit notifications and unread behavior; invoice exclusions, real status filtering and financial totals; expandable parent reports; and mobile navigation for all three roles.

The connected rescheduling journey executed a student request, admin approval, verification in both schedules, attendance marking and invoice generation. The replacement appeared once at RM80; the cancelled original was absent. Additional browser journeys verified year-end recurrence generation, preserving cancelled future rows after stopping a series, and a confirmed calendar drag with database persistence and trial status retained.

One initial parent mobile test selected a dashboard link behind the open menu. A corrected test scoped the click to the navigation modal and passed. This was a test selector issue, not a hidden application failure. Both [original core observations](browser-core-original.json) and [follow-up journeys](browser-journeys.json) are retained. The consolidated count replaces that observation with the successful retest and excludes its duplicate.

## Slowness investigation

The main identified bottleneck was repeated schema initialization on normal database access, compounded by sequential queries. The repaired database layer uses a schema-version check, shared initialization and migrations only when needed. Page reads also batch independent work.

In the isolated replay, eight concurrent cold helpers fell from **168 client calls / 512 SQL statements to 9 client calls**, with no migration DDL on an already migrated database. A warm dashboard fell from 11 queries across four waves to eight queries in one parallel wave; invoice detail fell from eight to four queries. See [replay evidence and its method](performance-after.json).

A synthetic 30 ms latency replay reduced one cold student-detail run from approximately 716 ms to 95 ms. These are simulated local measurements with stubbed UI/auth, **not measured production improvements**. Prior public production checks covered the login and redirect only, not authenticated navigation. Vercel cold starts, the production database region, real data volume and external services still require measurement after deployment.

## What remains unverified

No production mutations or authenticated production walkthrough were performed. Real Google storage/video calls, physical print output, every device/browser combination and every theoretical business-state permutation were not exercised. Calendar drag was executed in a browser; not every resize gesture was. Migration tests used fresh and legacy fixtures, not a copy of live private data. Existing historical timestamps are preserved rather than guessed or rewritten.

The guide is the manual acceptance checklist for the remaining combinations. [Remaining validation](backlog.json) records deployment-dependent checks. The approved source changes are ready for review; deployment is a separate next step.

## Screenshots

- [Admin dashboard](dashboard.png)
- [Financial history](financial-history.png)
- [Calendar](calendar.png)
- [Expandable parent reports](parent-reports.png)
- [Mobile financial history](mobile-financial-history.png)
