# Documents / spreadsheets — 24 November 2026

Local implementation on top of 02401cd. This feature batch has not been pushed or deployed. No production business records were created or modified by these tests.

## Delivered

- Admin Documents and student My documents libraries, grid/table preference, saved-content previews, search, type/student/lesson-link filters, sortable columns and 20-file pagination.
- New document / New sheet, full-page editors in new tabs, workspace home/library shortcuts, rename/share/duplicate/archive/restore dialogs.
- Actual pinned CasualOffice Docs 1.4.2 React SDK and Sheets 0.20.0 published embedded SDK; no substitution with a text box or external public demo. The editor build is isolated from Next’s main dashboard bundles. Local font assets and retained attribution/licences are included.
- Standalone library creation has no class link. Meeting creation binds the class and grants its owning student access atomically. Class details and student notes expose the linked files.
- Explicit active-student view/edit grants; no parent/anonymous access. One active editor per file, expiring/renewable leases and revision checks prevent overwrites. Live collaboration is off by owner preference; no VPS or collaboration-service credential is needed.
- Autosave, visible pending/failure state, retry and download recovery, DOCX/XLSX export. Larger snapshots upload and reopen through bounded chunks; partial uploads do not replace saved content. Reads are pinned to one revision and preserve Unicode.
- Schema 10 adds document/grant/lease/staging tables. Existing business rules remain covered by the regression suite. MCP has a documents domain for the new admin workflows.

## Verification

- 165 automated tests passed, 0 failed. Seven document tests use real temporary SQLite and actual services: standalone/lesson creation and retry identity; active/scoped access; competing/expired leases; grants/revocation/archive/restore; duplicate/search/filter/sort/paging; malformed/origin/oversized requests; large chunked saves and revision-bound Unicode reads.
- Browser workflow results are recorded in browser-results.json, library-actions-results.json, final-smoke-results.json and sheet-final-results.json. Covered grid/table persistence, search, mobile library/table bounds, all library dialogs and pagination, Word typing/autosave/reopen/export, spreadsheet values/formulas/save/reopen/export, meeting creation/linking, class details, student notes, explicit view-only users and competing editor exclusion. No page errors were recorded in the passing runs.
- Root and isolated editor TypeScript checks and optimized builds passed. The final large-file browser check reopened a 5,625,895-character Unicode spreadsheet using 23 upload chunks and 29 read chunks, with no page errors; see large-file-results.json. Local opening took 5.8 seconds, which is not a production latency measurement.
- Evidence uses fake students/files and local production-mode servers. Production permissions/latency and every advanced upstream editor feature have not been separately certified by this batch.

## Limits and use

Live simultaneous editing is intentionally disabled. Viewers see the last saved version and reopen to refresh. Grid previews represent saved text/cell excerpts rather than full-fidelity rendered page thumbnails. No document version-history interface is included. Desktop editor behavior and 390px libraries were tested; a full mobile office-editing parity claim is not made. Hosting/database resource limits still apply even though staged transfer has no explicit total-file cap.

See docs/DOCUMENTS.md for numbered role/page use cases, build/storage notes and permissions.
