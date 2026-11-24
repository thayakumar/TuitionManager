# Gridcraft sheets integration — 24 November 2026

New editable spreadsheets use the actual Gridcraft 0.19.1 WebAssembly release, hosted by TuitionHub. Docs remains CasualOffice. Existing JSON sheets retain their original editor; view-only sheets retain the read-only preview. No destructive conversion or database migration was performed. Live collaboration remains disabled; single-editor leases continue to protect saved work.

## Verification

- 172 automated tests passed, zero failed. Includes actual Gridcraft-exported XLSX fixture save, duplicate, chunked-save and malformed snapshot checks alongside existing authorization/lease tests.
- Office TypeScript/Vite and full Next.js production builds passed; root typecheck passed.
- Browser workflow: create lesson-linked sheet, evaluate formulas, autosave, reload with formulas intact, XLSX download, concurrent tab read-only preview, mobile bounds, correct WASM MIME/cache headers.
- Uncommitted cell entry stayed unsaved during autosave; Save now committed and persisted it.
- A deliberately failed HTTP503 save retained work; Retry save persisted it successfully.
- Student browser: real keyboard cell input, Ctrl+S and saved work, change to view permission, rejected write, correct read-only preview. Existing legacy workbook and Docs editor reopened successfully.
- No JavaScript page errors in the passing walkthroughs. Early harness runs were corrected to wait for the visible editor and use real canvas clicks rather than synthetic focus assumptions.

All writes and failure injection used isolated local SQLite data. Production smoke checks do not create documents, messages or notifications.

## Practical limits

Gridcraft needs a modern WebGPU/WebGL2 browser. The initial WASM download is roughly26MB uncompressed and is isolated from other pages; its hashed assets are cached. Read-only preview is a separate existing engine and may display advanced Gridcraft features differently. Existing JSON workbooks are intentionally not migrated automatically. Full upstream feature parity and simultaneous collaboration are not claimed.

See docs/DOCUMENTS.md and the numbered user capabilities guide for use cases. Browser evidence is in browser-results.json, role-results.json and desktop/mobile screenshots.
