# Studio: visual overhaul

The November 16 redesign replaces the earlier purple version. The user explicitly requested a complete visual revamp and a different colour scheme. The earlier desktop proposal informed the spacing and hierarchy; its original red accents and preview-only role switcher are not part of this implementation.

## New direction

Ink blue anchors the identity, teal marks primary actions, and apricot, sage and soft blue distinguish supporting information. White surfaces sit on a cool paper background. The new visual system covers the admin, student and parent workspaces and both sign-in experiences.

- New split-screen sign-in layout, educational illustration and real links between admin and student sign-in.
- Workspace header with current page breadcrumbs and a role indicator. The role indicator is descriptive, not a permission-changing switch.
- Grouped admin navigation: Teach & learn, Business, Stay connected. Classroom now sits alongside students and scheduling.
- Rebuilt dashboard introduction and action placement; lightweight metric cards, lesson avatars, next steps, and revised chart colours.
- Restyled classroom banner, lesson and profile panels, invoice documents, forms, tables, tabs, dialogs, empty states, buttons and notification accents.
- Page entrance and staggered panel transitions; responsive hover/press feedback, focus treatment and smoother dialogs. No animation framework or runtime dependency was added. Reduced-motion preferences disable the decorative motion.
- Shared responsive styling and mobile navigation across all three roles. Printed invoices retain a clean document layout.

Business policies, ownership rules and backend calculations were preserved. This is a visual implementation on the existing application, not a new backend or a change to the invoicing/attendance policies.

## Screenshots

| Area | Preview |
|---|---|
| Admin sign-in | [Desktop](admin-sign-in.png) |
| Overview | [Desktop](admin-overview.png) · [Mobile](admin-mobile.png) |
| Students | [Roster](admin-students.png) · [Student details](admin-student-detail.png) |
| Schedule | [Calendar](admin-schedule.png) · [Scheduling dialog](schedule-dialog.png) |
| Finance | [Financial history](admin-financial-history.png) · [Invoices](admin-invoices.png) · [Invoice document](admin-invoice-detail.png) |
| Teaching | [Classroom](admin-classroom.png) · [Assignment](admin-assignment.png) · [Lesson detail](admin-lesson-detail.png) |
| Student | [Sign-in](student-sign-in.png) · [Overview](student-overview.png) · [Mobile](student-mobile.png) · [Profile](student-profile.png) |
| Parent | [Overview](parent-overview.png) · [Reports](parent-reports.png) · [Mobile](parent-mobile.png) · [Invoice](parent-invoice-detail.png) |

All screenshots show isolated fake test records, not production data.

## Verification

- **30 automated business regression tests passed**, 0 failures: [log](tests.txt).
- **Production build passed**, including TypeScript checking: [log](build.txt).
- **38 browser checks passed**, with no unhandled page errors: [results](browser-results.json).

The browser walkthrough loaded 29 role/page combinations plus both sign-in pages and additionally checked the scheduling dialog, sidebar collapse, mobile overflow and menu navigation for all three roles, and reduced-motion behaviour. Desktop screenshots used a 1440 × 1000 viewport; mobile used 390 × 844. The executable [walkthrough script](walkthrough.cjs) records its environment and fake-data assumptions; it needs the local fixture and Playwright runtime, not production access.

An initial harness used an aside selector for the parent drawer; the parent drawer is a dialog. The corrected modal-scoped navigation check passed in the final run. The build was restarted before collecting final screenshots so they use the final palette and layouts.

This is focused visual and interaction regression coverage. It does not claim every action or device combination was re-executed; the prior business audit and its manual use-case guide remain relevant. Live external integrations and authenticated production performance were not exercised.

**No commit, push or deployment was performed. The production site remains unchanged.**
