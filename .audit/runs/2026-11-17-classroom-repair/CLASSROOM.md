# Classroom layout, attachment management and work states

## Implemented

- Student assignment pages show instructions, a full-width Submitted work section, and a separate full-width Submit work section below it. File-only latest attempts are displayed with a prominent attachment card; original feedback and earlier attempts remain in history.
- Tutors see the same attachment cards under Student Work. Post images have lazy-loaded thumbnail previews and all Drive links use the authenticated file endpoint.
- Assignment status badges share one palette: Assigned blue, Turned in/Awaiting grading amber, Graded green, Missing slate. Stream, classwork, gradebook and post-detail views use the same component. No ordinary assignment status uses red.
- Edit post loads existing attachment metadata for every entry point. Remove/Keep and new uploads are saved together through the server transaction. Adding a replacement means removing the old file and choosing the replacement before Save. Removing the post reference does not delete the Drive file.
- Post attachments use the shared resumable upload helper and no client file-size cap. Add from Drive can recover a previously uploaded file by explicit selection, after the connector upgrade. A failed selected file blocks publishing until retried or explicitly discarded.
- Rich image upload state blocks publishing/submitting while pending or unresolved. Retry/Discard remain available in the editor.
- Topic selection and New topic controls stack instead of squeezing the select. Wider composer organization column applies only when the viewport has room.
- Foreground post/submission actions opt into the shared blocking loader, with upload progress for submissions.
- Class comments appear after the post/work area for every post type.

## Verification

Executed: eight route-rendering/history/palette regression tests pass (`tests/classroom-views.test.cjs`). Two added regressions prove file-only work remains visible with separate sections and shared status colors avoid red.

Browser evidence will be written to `classroom-browser-results.json` after the combined build is available. The browser harness uses isolated student 1901 so it does not revoke another suite's student session.


Final executed browser result: 7 checks passed. See classroom-browser-results.json.
