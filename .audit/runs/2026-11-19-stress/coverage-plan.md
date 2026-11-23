# Stress and failure coverage

Actor coverage: tutor/admin, owning active student, another student, inactive/expired identities, parent bearer link, revoked/foreign parent link, unauthenticated caller and month-end scheduler.

Execution order: baseline regression suite; independent source/lifecycle sweeps; concurrency and fault injection; large-data route/UI walkthrough; replay corrected failures; production-build verification; safe deployed smoke.

Checks follow business consequences: attendance → invoice eligibility; recurring stop → future/history; reschedule → trial/replacement/notifications; resubmission → lineage/latest grade; diagnostic save/submit/lock → frozen/hidden reports; chat send/retry/read → unique message and correct room; upload begin/chunk/finish → owned recoverable file; private file → scoped range/preview access.

Stress runs increase local HTTP concurrency and dataset size, measure response/error distributions and verify no duplicate financial claims, lost committed work, cross-family data, or unbounded overview lists. External-provider calls use controlled local responses and injected failures; no live production load test is authorized or necessary.

The linked architecture skill is executed separately: candidates get a visual HTML report in /tmp, and the user chooses a candidate before architecture interface design/refactoring. Routine demonstrated defect fixes are already authorized.
