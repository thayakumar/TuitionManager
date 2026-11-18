# Family chat rooms and PDF loading

## Implemented behavior

Every new student receives a private family chat in the same creation transaction. Migration adds rooms for existing students. Admin has a searchable multi-student inbox; students and parent-link holders see only their family. Rich text, clickable links, pasted images, file attachments, replies, message edits/deletions, unread navigation badges and read indicators are included. Tutor moderation is supported; changes retain database history. Profile avatars are reused where available.

Chat is integrated with TuitionHub's existing identities rather than requiring an additional Chatwoot deployment. It is a family conversation feature; voice/video calls, push delivery and end-to-end encryption are not implemented. Visible conversations poll every five seconds; navigation polls only a small aggregate unread response. Hidden tabs pause polling. Edits, deletions and read indicators refresh for loaded history too.

Parents can upload through their valid bearer link. Upload sessions bind its hash and revalidate revocation on begin/chunks/finish. Unsent parent files remain private to that link; only explicit chat sharing grants the family access. Parent credentials are removed before storing message content or attachment URLs. Every room/message/file operation checks family scope on the server.

PDFs now open in the current page with byte-range responses, rather than probing a full download before opening. Metadata inspection uses a tiny HEAD read, known PDFs skip the probe, and streamed reads are bounded and cancelled when closed. Explicit download remains available. Existing connector version 2 works without an update. Google service latency still affects initial loading; live-provider performance was not measured.

## Verification and corrections

The combined release passes 89 automated tests and the production build. Chat tests exercise role boundaries, active/revoked parent links, attachments, body/URL sanitization, duplicate sends, history, replies, unread/read counts and transaction-created rooms. PDF tests verify real byte sequences, full/middle/suffix ranges, invalid ranges, cancellation and family file isolation.

Eight three-role chat browser checks, two both-role PDF browser checks, six profile checks and three dashboard/meeting checks use isolated SQLite and controlled storage bytes. JSON results and screenshots are beside this report and in ../2026-11-18-dashboard-profile. Production Google Drive uploads and real video service connections were not exercised.

An initial chat run passed its visible-message checks, but database inspection found previous text could return after sending: locking/unlocking the shared rich editor emitted a stale update. setEditable now suppresses that update; the final browser run additionally checks that composers empty after sending and attachment-only messages store no previous text. Failed unchanged sends retain their idempotency key; changing the draft creates a new key.

## Activation limitation

Automatic month-end drafts are included in this release but require CRON_SECRET configured for the Vercel Production environment and a deployment with that setting. Missing configuration fails closed rather than allowing anonymous billing. See docs/MONTHLY-DRAFT-INVOICES.md. No production billing run was performed.
