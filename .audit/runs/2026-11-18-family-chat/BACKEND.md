# Family chat backend verification

Executed: five new real-SQLite scenario tests in tests/family-chat.test.cjs, plus profile/whiteboard migration compatibility tests (13 combined), all passing. The fifth aggregate-summary test was added after that combined run and also passes. TypeScript passes. Browser integration is reported separately by the parent task.

- Schema v7 creates one room per existing student and stores messages, bounded role-specific read positions and append-only edit/delete history. Student creation inserts its room in the same transaction.
- Every list/thread/mutation derives the tutor, student or parent identity from a current session or active scoped parent token. Choosing a viewer role cannot impersonate that role. Student deactivation and parent-link revocation are enforced on reads and writes.
- Parent actor keys hash the token. Parent-upload metadata adds nullable uploaded_files.parent_token_hash while retaining the established student-family owner relation. The bearer credential is removed from stored chat image/file URLs.
- Text and inline image HTML is sanitized. Attachment names/MIME come from the upload registry; ownership, exact parent upload hash and same-family reply targets are verified before committing. Empty messages are rejected; file-only messages are valid.
- Client IDs make send retries idempotent. Edits/deletes check ownership; tutor moderation may delete another participant's message. Tombstones hide original body/files from ordinary reads; the history table retains the original version.
- Initial and older pages return 50 messages. Incremental pages and refreshIds (maximum200 loaded IDs plus latest50) update edited/deleted older messages and read receipts. Room queries return unread counts. Reading an unchanged position performs no write; thread snapshots use read transactions.
- The JSON mutation route requires same-origin browser requests and bounds request text. Parent links remain scoped bearer credentials; this is not end-to-end encrypted messaging, a separate parent-account system or a voice/video calling service.

Scenarios executed: migration/backfill and new-student atomic room creation; three-role ownership/read counts and receipts; foreign-family access, revoked links, inactive/no-session students; sanitized/empty content, retry deduplication, pagination/refresh, foreign replies, edit/delete permissions/history; registry attachment ownership, parent upload identity and credential removal.

Navbar polling now requests summary=1: the database returns a COUNT aggregate and viewer role, without serializing any room names or message bodies. The fifth executed scenario verifies exact response shape and counts across author/read/deleted/parent-revoked states.
