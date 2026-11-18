# Navigation, branding and Overview

## Changes

- The existing metrics/teaching page is now Dashboard at /dashboard. Existing / links resolve there.
- Admin Overview is a separate page at /overview, with twelve large navigation cards: Dashboard, Students, Schedule, Classroom, Whiteboard, Invoices, Financial history, Plan a lesson, Recurring lessons, Requests, Notifications and Settings.
- All four Dashboard statistic cards link to the corresponding records.
- A shared clickable TuitionHub logo appears on admin/student/parent navigation, phone headers/drawers, sign-in pages, meetings and fullscreen whiteboards. Each authenticated role returns to its own dashboard; parent links stay within the current scoped token.
- Meeting home navigation flushes pending private notes before leaving. Whiteboards retain their full canvas and use a compact logo beside Board options.
- The collapsed admin rail now centers icons and its logo, with the unread count positioned separately so a three-digit count cannot widen the rail. Horizontal overflow is contained.
- Sidebar scrolling remains available by wheel, touch and keyboard on short screens. The narrow rail no longer shows the distracting internal scrollbar.
- Parent phone navigation closes after a logo click even when the user is already on that dashboard.
- Dashboard refresh invalidation and breadcrumbs include the new page names and routes.
- The old homepage redirect runs before React rendering; redirects preserve the public request host/protocol.

## Executed verification

Production build and TypeScript passed. All 64 automated regression/security tests passed. All 14 browser checks passed using isolated local data; no production business records were changed.

| View / flow | Result |
|---|---|
| Admin sign-in, legacy homepage, Dashboard and separate Overview | Pass |
| All twelve Overview destinations and four statistic-card links | Pass |
| Collapsed rail with 99+ unread badge, no horizontal overflow/bar | Pass |
| Persisted collapsed state across fourteen admin routes | Pass |
| 1024×480 screen: keyboard can reach Settings while the rail scrolls | Pass |
| Expanded labels and active Overview state | Pass |
| Admin 390/320 px phone header/drawer brand navigation | Pass |
| Seven student desktop pages and student phone branding | Pass |
| Five parent pages, scoped dashboard links and phone drawer | Pass |
| Personal and lesson whiteboard home links without shrinking canvas | Pass |
| Tutor/student meeting home action saves pending notes | Pass |
| Sign-in branding and anonymous Overview/Dashboard denial | Pass |
| No unhandled browser errors in the final run | Pass |

The detailed grouping and measurements are in browser-results.json. The rail width follows the app's larger base font (4 rem = 68 px in these captures), rather than forcing a smaller font to hit 64 px.

## Errors found during verification

- The original collapsed header padding/icon and inline unread badge exceeded the narrow rail's available width. Fixed the geometry and separated badge positioning.
- A streamed legacy-root redirect triggered a Next.js router hook error. Handling that redirect in middleware resolved it; the final run reported no runtime errors.
- Local Next.js middleware normalizes loopback-IP redirects to localhost. Browser tests use the canonical localhost origin to keep session cookies consistent. Proxy-origin redirect behaviour is separately covered by regression tests.
- An initial screenshot assertion assumed a 16 px base font. Corrected it to measure the app's actual font-scaled rail and assert that content fits.
- The parent drawer originally relied only on a changed pathname to close; the same-dashboard logo case now closes it explicitly.

## Screenshots

- [Overview desktop](overview-desktop.png)
- [Overview phone](overview-mobile.png)
- [Collapsed Dashboard](dashboard-collapsed.png)
- [Collapsed short screen](collapsed-short-screen.png)
- [Student desktop](student-desktop.png)
- [Student phone](student-mobile.png)
- [Parent phone](parent-mobile.png)
