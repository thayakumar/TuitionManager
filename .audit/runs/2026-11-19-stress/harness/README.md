# Isolated browser/load reproductions

These are the actual Codex Cloud scripts used for this run, retained for reproduction. They expect this checkout at `/workspace/TuitionManager`, Playwright at the Codex runtime path and Chromium at `/usr/bin/chromium`. They deliberately use a separate database at `/workspace/scratch/stress-20261119/stress.db`. No database, session token file or private diagnostic bank is committed. The seed derives only the synthetic diagnostic template from tests.

1. Run `node .audit/runs/2026-11-19-stress/harness/seed.cjs` to create the isolated synthetic fixture and local session file. Do not reseed while test requests are running.
2. Run `npm run build`, then start Next with `TURSO_DATABASE_URL=file:/workspace/scratch/stress-20261119/stress.db TURSO_AUTH_TOKEN= npm start -- --hostname 127.0.0.1 --port 4710`. Configure a local controlled storage relay only for provider-specific testing; no real uploads are needed for these browser/read checks.
3. Set `TEST_BASE=http://localhost:4710` and run individual scripts in this directory. Run `http-load.cjs` first, then `ui-matrix-final.cjs`. Run the targeted mutation fixtures sequentially. For `comments-history.cjs` and `gradebook-snapshot.cjs`, also set `RUN_LABEL=after` so their regression assertions execute. `edit-form-fault.cjs` accepts the same label for its output filename.

The loopback guard rejects production URLs. Evidence JSON/screenshots are written into the run directory and may overwrite the recorded output. Scripts with `-after` use actual local sign-ins and some scripts directly add synthetic records. The 96-view matrix substitutes video and does not establish live meeting/provider reliability. `ui-focused.cjs` may observe the browser favicon request separately from application runtime errors.

Automated application regressions are separately runnable with `npm test`; that command needs neither Playwright nor this browser fixture.
