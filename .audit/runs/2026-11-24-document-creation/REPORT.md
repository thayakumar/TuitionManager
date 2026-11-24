# New document / New sheet tab recovery

The original library opened about:blank and then navigated that tab after the create request completed. Both creation buttons now use native links to an authenticated same-origin creation page. That page displays progress, owns the create request and navigates itself to the editor. Errors/timeouts are visible there with Retry. Request identity survives retries/refreshes, including a lost acknowledgement after the server already committed. The original library receives a completion signal and refreshes its list.

Direct/pasted/external creation URLs require an explicit Create click; trusted library/lesson buttons start automatically. GET rendering and link prefetching do not mutate records. Existing role checks, class linking and backend idempotence are unchanged.

Verification:

- Root TypeScript check and optimized production build passed.
- Seven existing document backend tests passed against isolated SQLite.
- Browser tests passed for both file types with delayed creation, named loading pages, automatic editor navigation, standalone classification and library refresh.
- Simulated lost acknowledgements after a real local commit: Retry (document) and refresh (sheet) opened the original file with the same request identity.
- Meeting-created sheets retained lesson association and the owning student grant.
- No page errors in passing browser tests. See browser-results.json and loading screenshots.

A live Chromium recheck of the original button returned200 and opened a private blank document; the permanent blank-tab symptom was not reproduced on that browser. The patch removes the fragile handoff and provides visible recovery rather than claiming a browser-specific cause was proven. That live retry created one private Untitled document; existing student, class and billing records were not changed. All delay/failure/retry cases used isolated local data.
