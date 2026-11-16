# Scenario design and execution ledger

Fixtures: fake Alice1/Bob2 at RM80/hour, completed and future lessons, trial class, distinct private posts/files/messages; parent bearer token for Alice. Every HTTP test targets127.0.0.1:4310 with a separate SQLite file under scratch. External upload is a local fake connector. Separate Playwright contexts represent actors. Module integration uses independent /tmp DB files and explicit auth stubs. No scenario used production.

Given/When/Then root scenarios:
- S-AUTH: Given anonymous/forged/real admin/student/parent identities, request private reads and mutations. Then only actual role and owner access succeeds, DB unchanged on denials; F01–F05. Controls include invalid token and guarded write. Executed HTTP/browser.
- S-INVOICE: Given one completed RM80 lesson, concurrently generate two period invoices. Then at most one claim and invoice amountRM80; observed two claims. Executed module integration, auth stub.
- S-APPROVAL: Given pending trial reschedule, approve twice. Then one replacement, original classification retained, correct recipient; observed two and trial0. Executed module integration.
- S-TIME: Given10:00MYT user input and November billing defaults, create lesson/open invoice dialog. Then02:00Z stored and Nov1–30 inputs; actual10:00Z and Oct31–Nov29. Executed module/browser.
- S-FAILURE: Given valid original class, cancel+invalid reschedule date. Then no domain mutation on error; canceled persisted. Executed module.
- S-RECURRENCE: Given generated lesson, then unmarked attendance and video room; observed present/null. Given stop request, future canceled and prior history preserved per user decision; focused policy test recorded separately.
- S-PARENT: Given RM80 sent +RM80 canceled invoices, fetch parent debt. ThenRM80; actualRM160. Executed browser.
- S-NOTES: Given A save in flight and newer B dirty, resolve A then leave before B timer. Then B persists or navigation warns; traced loss. Not browser executed.
- S-TOPIC: Given open post dialog, create topic inline. Then new topic selectable; traced stale copied state. Not browser executed.
- S-GESTURE: Given controlled eventNov12, propose Nov13 move. Then either supported persisted move or disabled action; store accepts true without changing date. Executed store; full pointer gesture not run.
- S-LIFECYCLE: Given submitted work and new correction, expose resubmit and apply chosen regrading policy. Traced policy conflict; requires Q4.
- S-BOUNDARY: Same-day past/today/month-end/next-month classes and attendance late/null/canceled variations. Formula and SQL traces with concrete examples in route notes; not all dynamically run.

## Invariants

I1 Unauthenticated caller never reads private records or changes domain data. Executed FAIL.
I2 Student post/class writes and reads belong to authenticated student. Executed FAIL.
I3 Invoice total equals sum of items. No universal fault-injection run; transaction gap traced.
I4 At most one active invoice claim per billable lesson. Executed FAIL.
I5 Failed composite action leaves domain data unchanged. Executed FAIL.
I6 Request owner matches class owner and resolution processes once. Executed FAIL.
I7 Rescheduling preserves free-trial classification. Executed FAIL (flag; downstream invoice charge traced).
I8 Generated lessons start unmarked and have unique usable meeting rooms. Executed FAIL.
I9 MYT wall-time round-trip and date boundaries agree. Executed FAIL.
I10 Recurrence accepts bounded valid finite parameters and terminates. Traced FAIL for malformed day/interval; intentionally not hung.
I11 Inactive/expired student session access matches chosen policy. Executed old token accepted; policy unresolved.
I12 Absences free and canceled classes absent from invoices. User-defined; actual isolated module test FAIL total160 expected80, canceled line present.
I13 Stopping recurrence preserves past history and cancels future only. User-defined; actual isolated module test FAIL past/future scheduled rows hard-deleted.
I14 Invoice outstanding/status agrees across admin and parent. Executed parent mismatch.

## Limits

All invariants were assessed, but not automatically rerun after every UI action. Full endpoint/form negative permutations, all mutation atomicity injections and every cross-role stale-open-page matrix remain unexecuted. Open pages generally require reload; this delay alone is not a defect without a realtime promise. Every raw result carries method/evidence and is in scenario-results.json. Render-smoke checks are not complete journeys.
