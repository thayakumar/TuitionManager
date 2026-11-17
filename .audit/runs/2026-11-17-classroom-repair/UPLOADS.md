# File storage repair

## Root cause traced in the old connector

The old Apps Script called `folder.createFile(blob)` and then `file.setSharing(ANYONE_WITH_LINK, VIEW)`. If domain policy rejects public sharing, the catch returned only an error, throwing away the created file's ID. The app consequently had no successful attachment result to save against the post/submission. Merely rendering attachment cards cannot recover those missing database associations.

The connector now keeps files private and returns their ID and URL after creation. The authenticated app serves permitted file bytes; no public-sharing permission is required. A configured admin can list the latest 50 files from the tuition Drive folder and explicitly recover an already-uploaded file into a post.

## Size and transfer

The old 4 MB threshold was a Vercel request-body workaround. New clients ask the server for a signed Drive resumable-upload session and send 8 MB chunks directly from the browser to Google Drive. The app no longer imposes a material-file size cap on that path; Drive quota, provider file limits, connectivity and account permissions still apply.

The old small-file multipart endpoint remains as a compatibility fallback while the external connector is being upgraded. A larger file on an old connector gets an actionable setup message rather than a failed oversized Vercel request or false success.

## Access control

- Verified completed uploads register an immutable owner in `uploaded_files`.
- Upload tickets bind the target file, current caller and expiry. The server validates the provider's upload-session host.
- Private file reads require an administrator, the active student who owns the upload, an owner-bound pending receipt, or a tutor-authored post/attachment/comment shared with that student.
- A student's arbitrary file ID pasted into their own work does not grant access to another student's private file.
- Recent-file recovery is admin-only and rejects foreign-origin selection requests. The connector independently limits reads/recovery to its configured Drive folder.
- HTML/SVG content is not served inline. Only PNG/JPEG/GIF/WebP images use inline responses; other materials are downloaded with `nosniff` and private/no-store headers.

## External setup required

The repository cannot silently replace a deployed Google Apps Script. An administrator must open Settings → File storage, copy the generated script containing the app's connector secret, replace the existing Apps Script, run `authorizeConnector`, accept the Drive and external-request permissions, and update the existing web-app deployment to the new version (execute as the owner; access Anyone). Updating the existing deployment preserves the configured URL. If a new deployment URL is used, update `APPS_SCRIPT_UPLOAD_URL` in Vercel.

The optional explicit Apps Script scopes are `https://www.googleapis.com/auth/drive` and `https://www.googleapis.com/auth/script.external_request`. No Google OAuth token is sent to the browser: only the single-file resumable session URL is returned. The app-managed connector secret stays server-side and in the admin's generated connector script.

Files created by the old connector are not automatically attached: once upgraded, use Add from Drive to choose them. Files outside the configured folder are intentionally unavailable to the app proxy.

## Executed verification

Seven new upload tests pass, alongside the 13 existing security tests (20/20):

1. A 10 MB file uses direct provider chunks, progress and final registration; file bytes never go through the Vercel upload route.
2. Small old-connector uploads retain compatibility; large files do not attempt unsupported multipart transfer.
3. Signed upload tickets reject a different student, tampering and expiry; created private-file metadata is preserved.
4. Real upload-route begin/finish registers server-derived ownership and rejects unsafe provider session URLs and another student's ticket.
5. Real SQLite + private file route returns owned image bytes, blocks cross-student pasted-ID access, allows tutor-authorized materials and denies anonymous callers.
6. Recent recovery denies student and foreign-origin requests and registers an explicitly chosen admin file.
7. Storage setup secret creation is admin-only and reuses its atomically generated value.

The local fake connector (`scratch/approved-repairs/browser/drive-v2-mock.cjs`) supports real app-route browser tests for begin/finish/list/read. These tests do not verify the currently deployed Apps Script, Google CORS behaviour or production account permissions; those require the one-time external deployment above.
