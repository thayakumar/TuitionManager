# Full-page whiteboards

Implemented:

- Personal and lesson whiteboards use the full browser viewport, with the drawing iframe at 100% width and 100dvh height.
- Application sidebar, workspace header and page cards are hidden for the personal board as well as lesson boards.
- A floating Board options button opens the board's details, saved status, download and navigation links. The personal board includes Back to workspace and recent lesson boards; a lesson board includes Class notes and All whiteboards for the tutor.
- Back to meeting is removed. No whiteboard navigation link returns a student to the meeting room.
- Save errors and version-conflict recovery remain visible automatically when details are collapsed. Loading and live status remain accessible to assistive technology.
- Conditional synchronization pauses while the page is hidden, reducing background database reads. Autosaves and recovery are unchanged; synchronization resumes on the next normal poll after returning to the board.

Validation:

- TypeScript passed after these source changes.
- Focused browser script prepared at scratch/approved-repairs/browser/whiteboard-fullscreen.cjs. Browser execution is pending the combined build and local test server.

Files: components/whiteboard-canvas.tsx, app/whiteboard/page.tsx, app/meeting/[classId]/whiteboard/page.tsx, components/Nav.tsx and components/main-wrapper.tsx.


Final executed browser result: 6 checks passed. See whiteboard-fullscreen-results.json.
