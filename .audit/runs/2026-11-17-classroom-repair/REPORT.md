# Classroom attachment and UI repair

## Result

Implemented all requested app changes. The production build/TypeScript check and all 63 automated tests pass. All 38 browser checks pass against isolated data.

The Drive connector is an external deployment. Its one-time update is required before production larger/private uploads and recovery of orphaned Drive uploads can be considered fixed end to end. Settings → File storage now provides the exact configured script and steps. No production files, posts, submissions or invoices were modified during testing.

## Attachments: cause and repair

The old connector created a Drive file and then attempted public sharing. A sharing-policy error returned no file ID, so the app could not save an attachment record even though the file existed in Drive. The post form also previously permitted publishing after a failed file selection.

- The v2 connector keeps uploads private and always returns the created file identity. Authenticated app endpoints serve permitted files without requiring public sharing.
- New uploads use direct resumable Drive transfers in chunks. The app imposes no per-file size ceiling on this path. Drive quotas and provider limits still apply. The legacy Vercel multipart fallback stays limited to 4 MB until the connector is updated.
- Confirmed a simulated 12 MB browser upload through two direct chunks, actual app upload registration, post saving and attachment rendering.
- A tutor can recover files already in the configured Drive folder using Add from Drive. Files orphaned by the old error cannot automatically reappear in Edit because their post association was never stored; explicit recovery supplies that association.
- Edit loads current attachments and allows Remove/Keep plus replacements. The transaction rejects removal of another post's file. Removing a reference does not delete the file in Drive.
- Private-file access checks uploader ownership or tutor-authorized sharing. A student cannot grant themselves access by pasting someone else's file ID. Legacy successful public submission links remain usable without granting new service-owner access.
- Failed selected/pasted image uploads block publishing until retried or explicitly discarded.

## Classroom and content

- Ordinary pasted URLs are automatically clickable, including URLs inside formatted paragraphs, without manually using Insert link.
- Images can be pasted into the rich editor or inserted from its image tool. Images upload to persistent storage; saved HTML contains a file reference, not a base64 blob.
- Student work is full-width below the post. Submitted work/history and the next submission form are separate. Attachment-only and image-only attempts are visible; tutors can open the same work from Student Work.
- Assignment statuses share one palette across stream, classwork, details and gradebook: blue Assigned, amber pending/turned-in, green Graded and grey Missing.
- Topic and New topic controls stack instead of squeezing the dropdown.
- Every post type has class comments. Tutor and student can post, edit their own comments, and receive a notification for a new comment. Tutors can moderate student comments. Other classrooms and parent bearer links cannot access the conversation.

## Other UI changes

- Foreground loading blocks repeated actions, preserves drafts on failure and releases controls afterward. Background note autosave, notification polling and whiteboard saves do not freeze the interface.
- Pending requests are compact; approval opens the original class, reason and proposed/custom choices. History shows original class, approved time, reason and tutor note without irrelevant alternative slots.
- Notification titles are the navigation links; separate View text is removed.
- Student navigation says My Classroom. Schedule months collapse, with only the current month initially expanded and placed first.
- Parent report rows use four correctly aligned cells with separate expandable details.
- Invoice detail line items have no search/filter/pagination controls.
- Whiteboards fill the viewport. Board options reveals details/controls, errors stay visible, and Back to meeting is removed.

## Verification

| Group | Passed |
|---|---:|
| Automated business, authorization, upload, migration and rendering tests | 63 |
| Classroom layout, attachment-only work, palette, edit and mobile | 7 |
| Requests, notifications, schedule, parent reports, invoices | 8 |
| Pasted images, automatic links, image-only attempts | 4 |
| Fullscreen whiteboard, drawing persistence, mobile and save recovery | 6 |
| Foreground progress, duplicate-click blocking, validation, failure recovery, success navigation | 7 |
| 12 MB upload, Drive recovery, private access, comments and storage setup | 6 |

Browser evidence is in the corresponding results JSON files. Google transfer calls were simulated; authenticated app routes, upload registration, database changes and private-file responses were exercised. This does not verify the production Google account's permissions or its live cross-origin upload behaviour.

Observed testing errors: two foreground form handlers delayed pending-state rendering; converted their client action handlers to normal submit handlers and verified progress plus recovery. An initial hydration error did not recur in the final frozen build. Other early failures were test selectors matching multiple editors/alerts, checks running before comments loaded, cancelled prefetch route interception, or reused fixture text; corrected those harness conditions and reran the affected checks.

## Performance and hosting

Keep Next.js on Vercel with Turso. GitHub Pages cannot run the existing authenticated server actions/API, and Google Sheets would replace transactional invoice/attendance/submission logic with a slower, more fragile service layer.

This change defers the post rich-editor bundle until its dialog is opened, pauses hidden whiteboard polling, avoids rendering collapsed parent report details, and limits comment invalidation to affected views. Further production speed work should measure authenticated page/action timing and colocate the application/database regions based on those measurements. No unmeasured production latency improvement is claimed here.

## Required Drive update

1. Open Settings → File storage → Prepare connector script.
2. Copy the script into the existing Google Apps Script upload project.
3. Save, select authorizeConnector and Run; approve Drive and external-request access.
4. Deploy → Manage deployments → Edit → New version → Deploy. Keep Execute as Me and access Anyone; update the existing deployment to preserve its URL.
5. Return to Settings and Check connection. Test a file upload, then use Add from Drive to recover any previous missing attachment.

## Review

- [Large saved attachment](large-attachment-post.png)
- [Submitted work sections](student-work-sections.png)
- [Comments](class-comments.png)
- [Pasted image](pasted-image-editor.png)
- [Parent report alignment](parent-reports-aligned.png)
- [Fullscreen mobile whiteboard](whiteboard-fullscreen-mobile.png)
- [Storage setup](drive-storage-setup.png)
- [Manual capabilities guide](../../../docs/USER-CAPABILITIES-AND-TEST-GUIDE.md)
- [Testing worksheet](../../../docs/BUSINESS-USE-CASE-WORKSHEET.csv)
