# Use TuitionHub from Hermes or another AI agent

TuitionHub exposes a remote MCP server with the owner’s admin capabilities.

**Server URL:** `https://tuition-manager-dusky.vercel.app/api/mcp`

**Manage connections:** [Settings → AI connections](https://tuition-manager-dusky.vercel.app/settings/agents)

The server uses stateless **Streamable HTTP**. Connect with a revocable bearer key or OAuth 2.1 authorization-code sign-in with S256 PKCE. Your website admin password is not an API key. Student and parent logins cannot issue agent credentials.

## Hermes: recommended connection-key method

This works for desktop Hermes and a headless/VPS agent without an OAuth browser callback.

1. Sign in to TuitionHub as admin. Open **Settings → AI connections**.
2. Create a connection named “My Hermes agent”. Choose **Full admin actions** and an expiry. Copy the key when shown; it cannot be retrieved after leaving that screen.
3. On the machine running Hermes, add the key to the active Hermes profile’s `.env` file. For the default profile this is `~/.hermes/.env`:

```dotenv
TUITIONHUB_MCP_KEY=PASTE_YOUR_PRIVATE_CONNECTION_KEY_HERE
```

4. Merge this entry into the active profile’s `config.yaml` (default: `~/.hermes/config.yaml`). Keep existing servers/settings:

```yaml
mcp_servers:
  tuitionhub:
    url: "https://tuition-manager-dusky.vercel.app/api/mcp"
    headers:
      Authorization: "Bearer ${TUITIONHUB_MCP_KEY}"
```

5. Restart/reconnect Hermes so it loads the configuration. Ask:

> Use the TuitionHub connector to show my dashboard and tomorrow’s classes. Do not change anything.

Hermes should discover `tuition_catalog`, `tuition_read` and `tuition_action`. Hermes may prefix these names with its configured server name. An unresolved `${TUITIONHUB_MCP_KEY}` is a local secret configuration problem; do not paste the placeholder or your website password as the token.

Hermes’s official configuration reference documents `url`, `headers` and `${VAR}` expansion: <https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/mcp-config-reference.md>.

## Hermes: OAuth alternative

For an interactive machine where Hermes can receive its loopback browser callback:

```yaml
mcp_servers:
  tuitionhub:
    url: "https://tuition-manager-dusky.vercel.app/api/mcp"
    auth: oauth
```

Run `hermes mcp login tuitionhub`, sign in to TuitionHub in the browser and approve the requested permissions. Hermes stores/refreshes its own tokens. This server advertises dynamic client registration, not client-ID metadata documents or device-code login; Hermes falls back to DCR. If a particular Hermes version needs it, add `oauth: { cimd: false }` under this server entry. For a headless agent, use the key method above.

Do not configure both an OAuth connection and an Authorization key header in the same entry.

## Other MCP clients

For a remote HTTP client, supply the server URL and either:

- An `Authorization: Bearer …` header using a connection key created in TuitionHub; or
- OAuth sign-in. The client must support authorization-code/S256 PKCE with dynamic registration, or already have a registered client ID.

Standard metadata is available at:

- `/.well-known/oauth-protected-resource/api/mcp`
- `/.well-known/oauth-authorization-server`

OAuth redirects must exactly match the client’s registration. HTTPS redirects are supported, with HTTP allowed only for loopback callbacks. Keys and OAuth connections can be revoked independently in the website.

For Codex CLI versions supporting remote MCP bearer tokens:

```bash
export TUITIONHUB_MCP_KEY='YOUR_PRIVATE_KEY'
codex mcp add tuitionhub \
  --url https://tuition-manager-dusky.vercel.app/api/mcp \
  --bearer-token-env-var TUITIONHUB_MCP_KEY
```

For clients that only support stdio, this repository includes a bridge. Install the repository dependencies with `npm ci`, then configure your client to run:

```json
{
  "mcpServers": {
    "tuitionhub": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/TuitionManager/scripts/mcp-stdio-bridge.mjs"],
      "env": {
        "TUITIONHUB_MCP_KEY": "YOUR_PRIVATE_KEY"
      }
    }
  }
}
```

Keep that configuration private. The bridge reads the key from its environment and forwards MCP tools/resources over HTTP; it does not need website cookies. Optional `TUITIONHUB_MCP_URL` changes the remote endpoint.

## How the agent uses all admin features

The small tool surface avoids sending a large catalog on every conversation turn:

1. **`tuition_catalog`** — Discover operations and their exact input schemas. Filter by `domain` or `operation`.
2. **`tuition_read`** — Read an operation using `{ "operation": "…", "input": {…} }`.
3. **`tuition_action`** — Perform an action using `{ "operation": "…", "input": {…}, "request_id": "unique-stable-id" }`.

Domains: `overview`, `students`, `schedule`, `attendance`, `reports`, `notes`, `billing`, `exports`, `classroom`, `files`, `requests`, `notifications`, `chat`, `diagnostics`, `whiteboard`, `settings`, `connection`.

These cover profiles/access and parent links; one-off/recurring schedules and attendance; class reports/private tutor notes; invoice generation/status/history and financial time series; classroom posts/topics/order/attachments/comments; current work/history/grading; family chats; diagnostic import/open/lock/results; personal/lesson whiteboards; files/storage setup and business/payment settings.

Browser-only presentation actions have semantic equivalents: filtering/pagination are read inputs; exports return CSV; invoice reads provide print links; class reads provide meeting/whiteboard links. Live video participation still opens the meeting interface. Storage environment configuration is a hosting task, just as it is for the website; the connector can generate the same deployment script and report configuration status. It cannot edit your Vercel account.

Retired holidays/reminders, student impersonation and student-only submission actions are deliberately absent. Agent credential issuance requires the owner’s browser session in Settings, rather than a tool that grants itself another connection.

### Example prompts

- “Show all outstanding invoices for October and the revenue trend for this year.”
- “Create a student named Aisha, rate RM80/hour, and give me the portal instructions.”
- “Find a free slot next Tuesday afternoon and schedule Aisha for90minutes.”
- “Review this reschedule request and approve Friday5pm instead of their proposed slot.”
- “Save this class report, then show the resulting attendance and invoice eligibility.”
- “Post this formatted assignment and attach the worksheet.”
- “Read the latest submitted work and previous feedback; return a grade only for the current attempt.”
- “Show the diagnostic answers and lock the result at the current revision.”
- “Send this reply to the student’s family chat.”

Dates without an explicit offset mean **Malaysia time (MYT, UTC+8)**. Grading, diagnostics and whiteboards require the expected version/revision so stale actions cannot overwrite newer work. Existing billing/attendance/history/notification rules apply to agent actions too.

### Reliable writes and retries

A write needs a stable `request_id` (8–128 letters/digits, dots, underscores or hyphens). Generate a new ID for a new intended action. Reuse the same ID only for the identical retry. The connection remembers completed results and rejects reuse with different input.

If an operation is still running or its outcome is uncertain, use `tuition_read` → `operation_status` with its `request_id`, then inspect the current records. **Do not retry a possibly committed write with a new ID.** Error results are marked `isError`; an error response does not mean a payment/message/class was automatically retried.

### Files

Use `upload_file` for small files. For larger files, use `upload_begin`, bounded `upload_chunk` calls with the returned ticket/ranges, and `upload_finish`. There is no total-file application cap in the resumable workflow; individual requests are bounded for serverless transport. The existing Drive connector must be configured. Use the resulting managed URL in a post or chat attachment.

`read_file_chunk` returns bounded base64 file bytes, MIME type and range information for agent-side downloading/inspection. No arbitrary URL-fetching tool is exposed. `recent_files` and `recover_file` support uploaded-file recovery using the existing connector.

## Interactive MCP Apps

Supporting hosts can render `tuition_read` results in an embedded TuitionHub panel with expandable records, local filtering and Refresh. The panel uses the official MCP Apps client SDK and never receives connection credentials. Clients without MCP Apps support still receive the complete structured tool results.

## Revocation and troubleshooting

- **401 / invalid token:** check the key, expiry, server URL and environment-variable expansion. Reconnect OAuth if revoked or refresh replay was detected.
- **403 / insufficient scope:** the connection is read-only. Create/authorize a full-admin connection when you want write actions.
- **Operation missing:** call `tuition_catalog` for the relevant domain; operation names and inputs are validated, not guessed.
- **Stale version/revision:** read current state and decide again; do not silently overwrite newer work.
- **Storage not configured:** use the website File storage setup or the connector’s setup-script operation. A working MCP connection does not bypass Drive permissions.
- **Key lost:** revoke that connection and create another; stored keys are hashes.
- **Disconnect:** revoke the connection in TuitionHub. This invalidates its existing credentials, including OAuth refresh tokens.

## Deployment/development

No extra MCP secret environment variable is required: credentials and OAuth state are stored in the existing database with the reviewed schema migration. Normal deployments use the Vercel production hostname. Set `MCP_PUBLIC_URL` to the canonical HTTPS site origin for a custom domain or preview. For isolated local tests only, loopback HTTP is accepted, for example `MCP_PUBLIC_URL=http://localhost:4750`.

`npm run build` bundles the MCP Apps panel before building Next.js. `npm test` covers credential boundaries, OAuth, retries and representative admin workflows. Keep load tests and fake writes on isolated data; normal production checks should not create fake students or send messages.
