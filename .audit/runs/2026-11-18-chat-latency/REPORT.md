# Chat send latency — 18 November 2026

## Root cause and change

Previously, the sender waited for a write request and then a separate full-thread read before showing the message or clearing the composer. This compounded server/database latency and blocked the next message. Recipients polled only every five seconds. These causes were traced in the source; the user's actual production send latency was not measured because tests do not write artificial messages into production.

Sending now immediately places a local bubble labeled Sending, clears the composer and queues the exact message snapshot. Composing the next message remains available. The bubble becomes confirmed only when a committed server acknowledgement or an authorized polling response arrives. Failed/ambiguous sends remain visibly unconfirmed with Retry message. The tab retains outgoing text, attachments, reply and original idempotency identifier in session storage; reloading restores interrupted work as unconfirmed. Parent bearer credentials are removed from persisted content, and storage keys are hashed and scoped to the viewing identity.

The write response includes the canonical message, removing the subsequent full-thread GET. Room authorization and attachment checks are batched. A new text send executes three transaction statements, versus the prior traced nine-statement send-plus-thread-read path, excluding identity and transaction-lifecycle requests. See BACKEND.md for evidence and boundaries.

Visible threads now poll every two seconds: incremental new-message/read-position responses alternate with four-second history snapshots to retain edits/deletions. Hidden tabs pause polling. This is polling, not a persistent real-time transport, so recipient delivery still depends on the network, server and poll cycle.

## Executed verification

96 automated tests pass and the production build passes. Backend tests exercise authorization, sanitized complete acknowledgements, sender-only correlation identifiers, batched file checks, idempotent lost acknowledgements and role-only read positions. Outbox tests cover interrupted work, exact retry identity, room-scoped reconciliation and parent-token removal.

Eight delayed/failure browser scenarios pass: immediate pending display and next-message queuing; incremental recipient updates; end-to-end recipient timing; failure/reload/retry; response lost after commit; poll-before-ack race; room switching during send; phone failure UI with no runtime exceptions. Eight existing three-role chat scenarios also pass, including formatted replies, edits, deletion, parent image uploads, private viewing, read indicators, unread badges and mobile layout.

In the final local production-build run, a pending bubble appeared in 146 ms while its POST was deliberately delayed 1,600 ms. A separate new message reached the other open participant in 2,100 ms. These are local controlled timings, including browser automation overhead, and are not production latency guarantees. All records and files used isolated SQLite and controlled storage.

Evidence: browser-results.json, screenshots and regression/browser-results.json. No production messages or attachments were created by the tests.
