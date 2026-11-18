# Student profile editing and photos

Students can edit their own full name, phone and email, upload a PNG/JPEG/WebP/GIF photo, replace it, or remove it. Subject, academic level, rate, access, guardian details and credentials remain tutor-managed. The profile page no longer queries or renders the stored password.

The server derives student identity from the current session, ignoring a submitted student ID. Saving checks active access again within the transaction. A photo must be registered as an image uploaded by that same student; arbitrary URLs, other students' files and non-image uploads are rejected. Image files are decoded in the browser before upload; SVG/HTML are excluded. Storage reads retain private scoped authorization and nosniff headers.

Profile photos appear in the student profile/header, the tutor's student profile and class chat avatars, and the parent's header. Parent file access validates its active bearer token and the exact child profile-photo file before serving bytes; it does not grant access to the child's general uploaded files. Removing the photo removes that parent authorization. Uploaded file removal from the profile does not delete the underlying Drive file.

Schema version 6 adds a nullable students.profile_photo_url without changing existing academic, attendance or financial history. Revalidation refreshes relevant student/admin/parent surfaces.

## Verification

Three real-SQLite tests pass: session identity/field whitelist/owned image persistence and removal, rejection of foreign or non-image files, rejection of admin-only/signed-out/deactivated identities, and a version-5 migration preserving student history. Upload route tests now assert MIME registration even when the connector omits fileType.

The first browser run caught a real integration defect: the upload endpoint saved file ownership and filename but omitted MIME metadata. Strict profile validation therefore rejected a newly uploaded valid image. The endpoint now records normalized MIME metadata at registration. Final browser outcomes are recorded separately in profile-browser-results.json.

All browser records and uploads use isolated fixtures and the controlled local storage provider, not production Google Drive.
