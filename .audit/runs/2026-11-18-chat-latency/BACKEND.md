# Chat send acknowledgement and backend latency

The previous client waited for the send POST and then an entire message-page GET before showing the new message. A traced plain-text sender path issued four transaction SQL statements for send and five more for the follow-up page read, in addition to identity checks and transaction lifecycle round trips. This sequence multiplies remote-database latency. Receiving clients also previously polled every five seconds.

The backend now returns a complete sanitized committed message in the send response. Edits return their updated message too. The response includes the sender's client correlation identifier, and message-page reads expose that identifier only to the actual author, allowing an optimistic UI to reconcile a polling update that arrives before its send acknowledgement. No extra thread fetch is required to display the confirmed send.

Room identity, active-student checks and parent-token revocation are checked in one scoped SQL statement. An ordinary new plain-text send executes three transaction statements: scope/room, duplicate acknowledgement lookup, and insert-returning. This count is executed evidence from instrumenting the real SQLite transaction. Attachment and pasted-image ownership lookups share a batch query; an example with two attachments and an inline image uses one ownership lookup, four total transaction statements.

Retries reauthorize the room, then return the canonical stored message before revalidating obsolete attachments. Thus a lost acknowledgement remains recoverable even if an uploaded-file registry entry has subsequently been removed. A revoked parent token still cannot replay the acknowledgement. Edit/delete authorization and audit history remain enforced. Parent bearer credentials are absent from saved content and acknowledgements.

Nine family-chat backend tests pass, including four new scenarios for the complete acknowledgement/owner-only correlation ID, lost acknowledgement retry, and batched file ownership. TypeScript passes. These measurements use isolated SQLite and stubbed caller identity; they do not measure live Turso or Vercel latency, and no production messages were sent.

Incremental message reads also include role-level read positions from the existing read-receipt query, without another database round trip. The payload contains only role and numeric last-read message ID, never parent tokens or actor identity keys. This lets a lightweight after-cursor poll update read indicators even when no new message exists.
