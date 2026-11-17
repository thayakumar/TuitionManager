# Rich text links and inline images

- Bare HTTPS/HTTP and www URLs are converted to links in rendered rich HTML, including paragraphs, lists and formatted descriptions. Existing hyperlinks and code/pre blocks are preserved without nested links. Unsafe URLs and embedded credentials are not linkified.
- The editor supports images pasted from the clipboard, dropped image files, and the Insert image toolbar action. Each image uploads to Drive through the shared upload client; the saved content stores an authenticated file reference rather than a base64 image payload.
- Uploaded images render responsively. Image-only student work is valid; empty or data-URI-only content is rejected.
- Upload progress locks editor controls. Failed image uploads retain the failed file for Retry and require either a successful retry or explicit discard before the surrounding post/submission form may publish.
- Comment editors can use compact formatting with bold, italic, underline, bullets, links and clear formatting.

Executed unit evidence: all four rich-text sanitizer/link/image tests pass. The business regression also confirms image-only submitted work persists in attempt history, while embedded data URI work is rejected. Browser evidence is recorded separately when the combined app build is available. Actual private Drive access depends on the connector upgrade described by the upload repair.


Final executed browser result: 4 checks passed. See rich-paste-results.json.
