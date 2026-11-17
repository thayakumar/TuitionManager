# Whiteboard persistence and access

## Implemented

- Schema 4 adds `whiteboards`: stable board key, optional unique lesson reference with cascade deletion, JSON data, positive revision and update time.
- Version 3 upgrades add only this table and schema marker. Version 2 upgrades retain the classwork-order migration without replaying historical submission or attendance backfills. Fresh/legacy setup still runs its reviewed migration path. No PRAGMA version writes.
- `GET/PUT /api/whiteboards/class-<id>` allows the tutor and the currently authenticated, active student who owns the lesson. Cancelled/completed history remains available. Parent bearer links alone grant no whiteboard access.
- `/api/whiteboards/personal` is administrator-only.
- PUT accepts a JSON workspace object and expected revision. First save uses revision zero. Successful saves increment the revision atomically; stale or simultaneous saves return 409 plus the current server snapshot without replacing it.
- GET returns an ETag. Conditional polls use metadata-only reads and return 304 with an empty body when the revision is unchanged.
- API responses are private/no-store JSON. Cross-origin requests are rejected; PUT requires a same-origin Origin header. Request reads are bounded and the serialized workspace is capped at 1 MiB. Data is stored as JSON, not executed as HTML.

## Executed evidence

All 48 regression tests passed before the final proxy-origin correction. All six targeted real SQLite/API/session tests in `tests/whiteboards.test.cjs` pass after that correction:

1. Current sessions, cross-student ownership, inactive/revoked student access, revoked admin access and parent denial.
2. Tutor/student round-trip persistence, conditional polling, stale-save rejection and concurrent compare-and-save behavior.
3. Admin-only personal board and lesson deletion cascade.
4. Same-origin enforcement, malformed JSON, invalid revisions, invalid board identifiers and oversized workspaces. HTML-looking text remains inert JSON.
5. Version 3 to 4 migration preserves classwork ordering and historical grading metadata.

Frontend/browser integration is verified separately by the canvas owner and primary agent.

6. Browser testing caught Next exposing an internal localhost URL, causing legitimate saves to be rejected. Origin checks now use the public host/protocol headers (with request URL fallback). The regression verifies local browser host aliases and HTTPS proxy hosting while continuing to reject foreign origins. Frontend browser retesting follows the rebuild.
