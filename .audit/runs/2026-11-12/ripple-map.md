# Ripple-effect and cross-user map

Legend: OK correct on refetch; FAIL defect; DELAY already-open view requires reload; POLICY unresolved. Dynamic server pages are not realtime. Financial lines are snapshots; statuses/profile/settings are live reads. See finding refs for exact readers/writers and module catalogs for all action variants.

|Fact/write|Admin reads|Student reads|Parent reads|Financial/side effects|Reverse / must not change|
|---|---|---|---|---|---|
|Attendance classes.attendance/status|FAIL percentage formulas F17; live raw detail|Live raw value; DELAY open page|FAIL percentage formulas F17; DELAY open page|User free absence; FAIL canceled line inclusion/completed absent F28|Present correction changes status; issued invoice correction outside stated workflow; other students must not change|
|Class creation / recurrence|FAIL room/premark defaults F13|Roomless generated lessons cannot join|Schedule live after reload|Quick/form notification drift F27|Delete cascades notes/reports; no overlapping check; other students unchanged|
|Cancel/reschedule|FAIL repeat/partial updates F11/F12|Wrong-recipient forged request F04; DELAY|Schedule refetch reflects rows|FAIL trial flag F07; invoice snapshots remain fixed|Reapproval/rejection does not undo replacement; preserve trial and class owner|
|Stop recurrence|Scheduled children hard-deleted|Future lessons disappear rather than canceled|Same after reload|Preserve completed historical docs but past scheduled history lost F29|User wants history preserved; no unrelated recurrence changes|
|Invoice generation|FAIL race F06, wrong default period F10|No invoice section in active student UI|Invoice values after reload; canceled debt F08|Snapshot rates/items; no payments ledger|At most one active lesson claim; transaction invariants; other student charges unchanged|
|Invoice status|Admin excludes canceled outstanding|N/A|FAIL includes canceled F08|paid_at overwritten on paid status; issued_at cohorts versus paid_at cash Q5|Month-end workflow stated; no assumed post-issue adjustment policy|
|Rate/business/currency edits|Live values|Limited profile only|Identity/currency/QR live on historic invoices|Line amounts frozen, labels not frozen|Historical snapshot policy not inferred; no automatic currency conversion|
|Post/topic creation/edit|FAIL inline option copy F24|Own list after refetch; FAIL foreign direct read/write F02|Not exposed|Notifications incomplete across paths F27|Cross-student content must never leak; deletion cascades submissions|
|Assignment resubmit/grade|Latest content retained old grade F21|UI hides resubmit; prior grade remains|Not exposed|Grade bounds F26|Regrade policy Q4; unrelated student's work unchanged|
|Teacher/student notes|FAIL potential race F23; own teacher scope|Own student notes; active token semantics F15|No private notes|Autosave delayed2seconds|Other note scope unchanged; late ack cannot mark newer text saved|
|Notification read/update|FAIL anonymous F03|FAIL other recipient ID accepted F03|No inbox|Stored only, no push scheduler F31|Marking own read must not clear other users; not reversible currently|
|Student deactivation|Soft historical row retained|Layout blocks but old action token accepted F15|Parent link still active|Historical fees/classes remain|Access policy Q3; data preservation already settled|

## Cross-user consistency matrix

|Fact|Admin|Student|Parent|Evidence|
|---|---|---|---|---|
|Private data|Forged cookie reaches private pages|Own post URL reaches foreign post|Valid token scoped to one student|Executed F01/F02; token controls pass|
|Canceled invoice debt RM80 sent+RM80 canceled|RM80 outstanding|No invoice UI|RM160 outstanding|Executed parent; traced correct admin formula F08|
|Upcoming same-day past class|Student detail may include it|Dashboard excludes via ISO bound|Dashboard may include; schedule excludes|Traced F19|
|8 upcoming classes|Full queries vary|Full count|Dashboard capped5|Traced F20|
|Present/late/absent rate|Present-only formula|Raw values|Two distinct denominators|Traced F17, policy needed|
|New schedule via drag|Store says accepted but date stays old|Persisted date old|Persisted date old|Executed store, UI chain traced F22|
|Canceled free trial replaced|Flag becomes0|New scheduled date|Eventually normal charge|Executed flag, money traced F07|
