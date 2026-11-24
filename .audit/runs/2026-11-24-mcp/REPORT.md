# Admin MCP connector — 24 November 2026

Implemented locally; this batch has not been pushed or deployed. Production endpoint verification is pending deployment. No production business data was changed during these checks.

## Delivered

- 88 operations in 17 domains, discovered through three MCP tools: catalog, read and action. The operation inventory is saved alongside this report.
- Admin student management, scheduling, attendance/reports, recurring lessons, invoicing/financial history, classroom/posts/topics/comments/grading, files, requests, notifications, family chat, diagnostics, whiteboards, exports and business settings.
- Existing application actions/services enforce business rules and notifications. Browser-only capabilities expose their semantic equivalents (meeting/print links, CSV, prepared sharing text). The connector does not join video calls or configure Vercel.
- Remote stateless Streamable HTTP, optional stdio bridge, revocable hashed bearer keys and OAuth authorization-code flow with S256 PKCE, exact redirect matching, one-use codes and refresh-token rotation/replay revocation.
- Browser-only Settings → AI connections, named/expiring full-admin or read-only keys, one-time key display and revocation. Tool credentials cannot authorize browser key management.
- Request-local agent identity; permission/expiry/revocation checks; persisted mutation IDs protect identical retries. An uncertain action requires state inspection rather than a new automatic retry.
- An MCP Apps result panel with expandable records, filtering and refresh for hosts supporting MCP Apps. Other clients receive normal structured/text tool results.
- Hermes bearer-key and OAuth instructions, Codex CLI configuration, generic remote clients and stdio setup in docs/MCP-SETUP.md. The instructions are also served by /api/mcp/instructions after deployment.

## Observed verification

1. Full regression suite: **158 passed, 0 failed**. Includes 15 MCP tests using real temporary SQLite, actual app services and official SDK clients. Covers migration from schema8 without altering saved grade snapshots; auth isolation, permissions, revocation, PKCE/client binding, refresh replay, Basic authentication, denied consent, operation retries and representative business actions.
2. Official SDK Streamable HTTP client connected through the actual protected route over a local HTTP listener: initialization, tools, reads, action and identical action retry passed. Revoked tokens returned401; unauthenticated requests returned401; hostile origins returned403; GET returned405.
3. Official SDK stdio client connected through the supplied bridge to that HTTP route and listed/called tools successfully.
4. Production-build local browser: create/hide/revoke key passed; OAuth consent, redirect state preservation and token exchange passed. No browser page errors. 390px mobile connection screen had no document overflow. Raw connection keys were hidden before screenshots.
5. Bundled MCP Apps UI in a simulated host: official UI SDK handshake, result rendering, local filtering and server-tool refresh passed, with no page errors. This is a simulated compatible host, not a claim of testing Hermes's UI.
6. TypeScript check and optimized Next.js build passed. Deployment tracing includes the served Markdown instructions.
7. Hermes configuration was checked against its official current reference; Codex CLI options were checked against the installed CLI help. Hermes itself was not installed or launched in this environment.

## Remaining external verification

Deploy this source batch, then verify production metadata, protected endpoint and an owner-created connection. Real Google Drive transfer/JaaS/video behavior depends on the existing external services and was not newly exercised against production by this connector test. AI clients must support the documented transport/auth method; embedded panels additionally need MCP Apps support.

Evidence: browser-results.json, app-panel-results.json, operation-inventory.json and screenshots in this directory. Automated tests are tests/mcp.test.cjs plus the existing suite.
