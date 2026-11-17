# Classroom, records and shared whiteboards

## Changes

1. Create opens a popup with Material, Assignment and Announcement choices.
2. Post descriptions, student work and meeting notes use a shared rich-text editor: headings, bold, italic, underline, strike, lists, links, highlight, alignment, quotes/code, undo/redo and clear formatting. Safe HTML is preserved; older plain-text links become clickable. Student submissions no longer have a separate URL field. Existing attempt and grade history is preserved; visually empty work is rejected.
3. Paperclip uploads attach multiple learning materials to any post type, including an existing post. Files and the post save in one transaction. Documents, spreadsheets, presentations, images, audio/video and archives are supported up to 4 MB each, ten new attachments per save.
4. Upload response handling accepts valid connector variants (`fileUrl`, `url`, `webViewLink`, nested data or a Drive file ID) without requiring a particular success flag. Explicit storage failures and unsafe URLs still fail. Permission/sharing failures now explain that Drive may already have received the file. The connector example returns the file ID as well.
5. Tables have all-column or selected-column search, filtered pagination and mobile labelled records. Student My Notes searches class dates and rendered content. Admin full student history searches records before server pagination. Printing includes all records despite an active table filter. Five-record overview previews remain limited; View all leads to full records.
6. Parents can request up to three future lesson times through their scoped link. Admin can approve a suggestion or choose another date/time. Existing conflict checks, free trials, lesson history and notifications are preserved. Draft invoices are hidden from parent lists, totals and direct links, and do not send availability notifications. Other invoice statuses remain visible.
7. Mobile student schedules, admin tables and student profile notes/reports/credentials fit narrow screens.
8. Excaliflow is bundled locally under its Apache-2.0 license. Admin navigation opens a personal Whiteboard; each meeting opens its lesson board in a new tab. Lesson boards appear with class notes, including whiteboard-only lessons. Tutor and owning student can edit. Personal boards remain admin-only. No AI key or separate service is required.
9. Lesson boards autosave, synchronize saved changes through conditional polling, preserve local drafts on failure, and use revision conflicts rather than silently overwriting another edit. Conflict controls download the local copy, load the saved version or explicitly save the local version. This is saved-version synchronization, without live multiplayer cursors. Boards are limited to 1 MiB of workspace JSON.

## Verification

**Passed: 49 application regression tests, 46 browser checks, the production build/TypeScript check, and eight Excaliflow core verification groups.**

Browser checks: 4 attachments, 9 rich editing/submission/notes, 13 tables/mobile, 5 parent requests/invoices, 7 native whiteboard, 7 whiteboard synchronization/recovery and 1 final mobile toolbar check. All passed. See the result JSON files and screenshots in this directory for executed evidence.

- Attachment browser tests use the real authenticated upload route and a local fake Drive connector returning a legacy response shape. Production Drive uploads were not performed, so actual deployed connector permissions/response remain unverified.
- Whiteboard tests use native pointer drawing, real local persistence, separate role sessions, reloads and saved-version synchronization.
- Automated business tests use isolated SQLite data. No production business records were modified for testing.
- Excaliflow's eight upstream verification groups were run against the bundled drawing code. The harness was adapted for this integration's intentional empty starting canvas and server-backed workspace serialization instead of shared browser localStorage.

## Observed errors and corrections

- Found and fixed a real whiteboard save 403: Next's internal request URL differed from the browser-facing host. Origin validation now checks the public host/protocol; a regression covers local and proxied production addresses while rejecting foreign origins.
- Fixed the upstream whiteboard's mobile toolbar overflow with a wrapping toolbar and initially collapsed style panel; all drawing controls remain available.
- Several early browser assertions needed adjustment for hydration/resize timing, a footer-vs-card locator and the application's existing single-current-student-session policy. Student suites were serialized so they did not revoke one another's sessions.
- Next can stream a not-found page with HTTP 200. Privacy tests check the rendered denial/no canvas or document and the authenticated API's 403/404, rather than relying solely on the page response status.

## Screenshots

- [Whiteboard on mobile](whiteboard-mobile-final.png)
- [Shared whiteboard](whiteboard-shared-student.png)
- [Conflict recovery](whiteboard-conflict.png)
- [Post attachments](post-attachments-desktop.png)
- [Student work history](student-rich-work-history.png)
- [Student profile on mobile](admin-profile-mobile.png)

## Manual guide

Updated [capabilities and test guide](../../../docs/USER-CAPABILITIES-AND-TEST-GUIDE.md) and [worksheet](../../../docs/BUSINESS-USE-CASE-WORKSHEET.csv). The guide includes numbered action/result cases for the new features and their dependent views.
