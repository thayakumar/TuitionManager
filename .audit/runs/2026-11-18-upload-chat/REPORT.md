# Whiteboard, image uploads and classroom chat — 18 November 2026

## Result

Implemented and verified on the production build with isolated fake records. All 69 automated tests, 15 browser scenarios and the production build passed. No production business records or Drive files were created during testing.

## Changes and errors resolved

- Whiteboard entry points open new tabs. A small house icon returns the board tab to the role's dashboard while the original tab remains available.
- Browser uploads previously transferred chunks directly to Google. A blocked cross-origin transfer can produce the reported generic “Failed to fetch”. Transfers now use authenticated same-origin 2 MiB chunk requests, signed upload tickets and bounded retry/probe recovery. This bounds requests without adding a total-file size cap. Real provider quotas and permissions still apply.
- When admin and student cookies coexist, upload and comment actions explicitly preserve the student context. Previously an admin cookie could select the wrong file owner or comment author.
- Legacy quiz posts displayed a submission form while the server accepted only assignment posts. Both supported work types now accept file-only submissions. Expired student sessions return an actionable sign-in message, preserving the uploaded attachment for retry without another upload.
- Posted, pasted and submitted images expand within the page. Downloads require an explicit action. Generic Drive attachment metadata is inspected before deciding whether to preview an image.
- Comments are chat bubbles: own messages right, other participant left, with profile icons, names and timestamps. Existing moderation permissions remain.
- Browser checks found and fixed image keyboard attributes being lost after closing a preview, and a long filename overflowing a phone dialog.

## Executed scenarios

Seven transfer/whiteboard scenarios passed: new-tab navigation and house icon; 12 MiB file via bounded same-origin chunks with browser Google access blocked; pasted image with injected transient storage failure then persisted preview; file-only legacy quiz submission with both cookies; private student image after removing admin cookie; expired session after upload followed by retry without another upload and exactly one history entry; no runtime exceptions/external browser Google transfers.

Eight chat/preview scenarios passed: tutor alignment; student alignment; mixed-cookie student author; generic-MIME recovered image preview; submitted-image preview; keyboard rich-image preview; tutor viewing student work; 390px phone layout and no automatic downloads/runtime errors.

Evidence: transfer-browser-results.json, chat-preview-browser-results.json, CHAT-IMAGES.md and screenshots in this directory. Automated tests use real application modules and isolated SQLite. Transfer integration uses a controlled Google/Apps Script provider and real bytes; chat preview fixtures substitute image bytes at the authorized file endpoint.

## Limits

The user's live Google Drive permissions and a real production upload were not exercised. The screenshot's network error alone does not establish its original network cause. The new app relay removes the browser-to-Google transfer dependency. An existing version-2 upload connector does not require a script update for this change.
