# Bright red/orange and classroom redesign

This revision supersedes the ink-blue/teal design at the user's request. It changes the shared visual system, enlarges typography and buttons, and rebuilds the classroom experience around Google Classroom's familiar information layout, adapted to TuitionHub's roles and requested colours.

## Changes

- Bright red primary actions, orange highlights and warm cream surfaces across admin, student and parent views. Charts, navigation, sign-in pages and invoice headers follow the palette.
- Larger typography throughout. The root is 17px; normal body text uses approximately 18px, smaller labels approximately 15px, and headings approximately 30–46px. The measured button font was 18.06px. Tiny 9–13px utility labels were replaced, including calendar labels.
- Larger pill-shaped buttons shared across every page, with more padding, rounded outlines, clear focus states, consistent hover/pressed feedback and larger notification badges.
- Classroom home now uses large course cards with coloured covers, subject/student identity and a clear open-classroom footer.
- Each classroom opens to **Stream**, with a large illustrated class banner, **Stream / Classwork / Grades** navigation, an **Upcoming** panel and spacious posts. Students have **My grades** in the same layout; data remains scoped to their own classroom.
- **Classwork** has a topic sidebar with working filters and larger items. Admins retain topic management and a **Create** menu for posts. Deleting a selected topic falls back to showing all topics rather than stranding the filter.
- **Grades** retains latest-submission grading semantics. Student assignment pages place instructions and the work/submission panel side by side on wide screens, stacking on smaller screens. Existing submission history remains available.
- Reduced-motion preferences still disable decorative animation. Sidebar decoration is hidden on shorter screens so the larger navigation has more space.

This is a Google Classroom-style layout using TuitionHub branding and the app's supported actions. It does not add unsupported People, comments or Google integration controls.

## Previews

- [Classroom Stream](admin-classroom.png)
- [Classwork with topic navigation](admin-classwork.png)
- [Grades](admin-grades.png)
- [Classroom home](admin-classrooms.png)
- [Student classroom on mobile](student-classroom-mobile.png)
- [Student classwork on mobile](student-classwork-mobile.png)
- [Student assignment](student-assignment.png)
- [Create material dialog](classroom-create-dialog.png)
- [Dashboard and larger text/buttons](admin-overview.png)
- [Sign-in](admin-sign-in.png)
- [Parent view](parent-overview.png)

Screenshots use fake local records, not production data.

## Verification

- **30 automated regression tests passed**, zero failures: [test log](tests.txt).
- **Production build and TypeScript validation passed**: [build log](build.txt).
- **46 local production-build browser checks passed**, with no unhandled browser page errors: [results](browser-results.json).

The browser run covered admin, student and parent pages; scheduling dialog opening/closing; sidebar collapse; mobile menus and page overflow; and reduced-motion behaviour. Classroom-specific checks exercised Stream rendering, View classwork navigation, topic filtering, Create material dialog opening/closing, latest grades, and Stream/Classwork/Grades on mobile for admin and student. Computed typography was checked in the browser.

These checks do not claim every possible business action or browser/device combination was re-executed. The earlier business regression suite and capability manual remain applicable. No live integrations or production actions were exercised.

**Nothing was committed, pushed or deployed. The production site is unchanged.**
