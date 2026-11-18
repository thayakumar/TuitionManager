# PDF loading and scoped file access

## Findings and changes

The old attachment inspection opened a streaming GET before determining its type, then discarded the response. The file endpoint used sequential 512 KiB reads and had no HTTP byte-range support. PDFs had no in-page viewer and were delivered as generic downloads.

- Known PDF attachments now open an in-page native PDF viewer directly. Other unknown attachments inspect with HEAD; that reads only one byte from the connector for metadata.
- The private file endpoint supports HEAD, Accept-Ranges and single byte ranges (including suffix ranges), with 206/416 and correct Content-Range/Length.
- Full transfers use 1 MiB connector chunks, under the existing v2 connector's supported maximum. Stream cancellation aborts pending provider fetches and stops subsequent reads. No connector redeployment is required.
- PDF content is served inline only on an explicit inline request. Image previews retain their existing behavior; other content stays an explicit download. Responses remain private/no-store and nosniff.
- Parent bearer access is restricted to the exact profile photo, that token's own uploaded files, or nondeleted attachments/images explicitly shared in its family's chat. Student draft-upload access excludes parent-owned drafts until they are posted. Cross-family and revoked-token access remain denied.

## Executed evidence

Two real-module/isolated SQLite tests in tests/pdf-files.test.cjs pass: 3 MiB PDF bytes, one-byte HEAD, middle/suffix ranges, invalid/multiple range rejection, full streaming byte equality, bounded read count, cancellation, unauthorized HEAD, family-specific PDF sharing, parent upload hash, profile access, student draft isolation, deleted chat references and revoked tokens. Existing 19 upload/classroom tests and TypeScript pass.

This verifies application/proxy behavior against a controlled provider, not live Google Drive latency. Apps Script and Google Drive still add upstream latency; a native PDF viewer may request additional ranges as pages are viewed.

The final production-build browser walkthrough on port 4684 passed two role scenarios (tutor and student), including an uploaded 1.2 MB valid PDF: in-page iframe, application/pdf response, unchanged post URL, no duplicate HEAD probe for a known PDF, no automatic download event, authenticated 64-byte 206 response, explicit dialog close and 390px no-overflow. Native viewer toolbar/page count appeared; PDF text extraction verified the fixture's content separately. These are application/viewer integration checks, not an assertion that browser-native PDF rasterization or live Google latency was exhaustively tested. Evidence: pdf-browser-results.json and pdf-inline-*.png.
