# Chat comments and in-page image previews

## Implemented

- The comments API explicitly derives isOwn from the authenticated viewing role. The student post page requests the student view and sends student-context actions, so an administrator cookie in the same browser cannot make a student's message appear as a tutor message.
- Own messages align right; the other participant's messages align left. Profile icons, names, timestamps and edit/delete controls remain available. Tutor moderation rights do not change bubble ownership.
- Post attachments use a shared attachment card. Image MIME types or image filenames (including recovered Drive files with generic MIME metadata) open an expanded dialog in the current page, without navigation or automatic downloading.
- File-only image submissions use the same authenticated inline endpoint; an unknown Drive attachment is inspected before choosing an image preview or an explicit file-download action.
- Images inside displayed rich text open the same preview on click or keyboard activation. Images are sanitized using the existing rich-text allowlist.
- Download is an explicit action inside the preview. Private image requests still use the app's scoped file authorization endpoint.

## Verification

Ten classroom route/history/palette/ownership/image-detection regression tests passed. Combined TypeScript check passed.

The browser harness is scratch/approved-repairs/browser/chat-image-preview-v3.cjs, using isolated student/post 8801. It verifies both-role bubble inversion, mixed admin/student cookies, posted-image and file-only submission previews, keyboard opening, tutor viewing, phone layout and absence of automatic download events/requests. Browser file bytes are simulated; live Google storage permissions and transfers belong to the upload-path checks.

Final browser verification: all 8 checks passed against the production build at local port 4674. No unhandled browser errors, automatic download requests or download events occurred. Desktop and 390px phone screenshots are saved beside this report. Two real issues found during verification were repaired and retested: student attribution with both role cookies present, and keyboard image controls/mobile long-filename dialog sizing.
