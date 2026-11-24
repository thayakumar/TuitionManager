# Wordcraft assessment

Reviewed upstream README and browser host source on 24 November 2026:

- https://github.com/storytold/wordcraft
- https://github.com/storytold/wordcraft/blob/main/apps/wordcraft-web/src/host.rs

Wordcraft is a Rust word processor with a WebAssembly browser build and MIT/Apache-2.0 licensing. Its familiar ribbon, DOCX support, tables, comments and tracked changes make it a plausible alternative for TuitionHub documents. It does not replace Sheets.

There is an actual same-origin embedding bridge: `?host=parent`, `wordcraft:ready`, `wordcraft:open` with file bytes, `wordcraft:save` with bytes, and `wordcraft:dirty`. This gives TuitionHub a way to load and persist documents without Google accounts or another collaboration server. The normal unhosted web app downloads saves instead; embedding alone is insufficient.

Our current CasualOffice Docs integration already stores DOCX snapshots in libSQL. A replacement could preserve the Documents library, grants, class links and one-editor leases while changing only the editor adapter. We would need to connect saves and failure reporting, verify autosave/read-only controls, preserve export versus document-save distinctions, and test DOCX round trips, image paste, fonts, mobile layout and WebGPU/WebGL2 startup. Browser performance has not been benchmarked here; upstream performance claims are not TuitionHub measurements.

Recommendation: build a separate preview against sample documents before choosing a replacement. No editor replacement has been made as part of the notification styling/sound work.
