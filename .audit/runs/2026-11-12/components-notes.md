# Custom component audit — 2026-11-12

Scope: every file under components except ui/ and reui/. All 40 files / 6,029 lines read fully, including the 795-line inactive example backup. No application files changed. Also read .audit/decisions.json, relevant lib/actions.ts functions, lib/jaas.ts and app/meeting/[classId]/page.tsx for cross-file traces. Existing explicit decisions (including predictable credentials and no permanent tests) respected.

## Prioritized findings

### C-01 High — invoice default month is shifted back a day in Malaysian browsers
Evidence **Executed** for the actual extracted getMonthRange function; downstream billing consequences **Traced**.
- components/generate-invoice-dialog.tsx:27-32 constructs local midnight first/last day, then serializes in UTC and takes date part.
- In TZ=Asia/Kuala_Lumpur on Nov 12, actual extracted/transpiled function returns `{start:'2026-10-31',end:'2026-11-29'}` instead of Nov 1–30. Executed command: `TZ=Asia/Kuala_Lumpur node` with function extracted from current source using TypeScript transpile; result recorded in tool output.
- components/generate-invoice-dialog.tsx:111-130 feeds these into date inputs; lib/actions.ts:636-637 interprets them as inclusive invoice bounds; query :650-656 selects lessons between those bounds.
- Sample: completed Nov30 lesson at RM80 excluded; unbilled Oct31 lesson included when admin accepts defaults. Student/parent invoice and admin dashboard totals inherit wrong selection. Workaround manually correcting both dates.
- Fix local calendar formatting (`date-fns format(date,'yyyy-MM-dd')`) and explicit business-timezone period boundaries (coordinate backend timezone fix). Mechanical; Small effort; Certain confidence.

### C-02 High — typed meeting notes can be lost while UI displays Saved
Evidence **Traced**, deterministic async interleaving, not browser-run.
- components/meeting-room.tsx:45-50 every save completion sets `saved=true` regardless of whether notes changed since request started.
- :55-59 schedules save 2s after edit and marks dirty; :67-70 clears pending debounce on unmount; :83-98 Leave/Hangup saves only when `!saved` and navigates immediately.
- Sample: type A; autosave A begins; while A awaits server, type B (dirty=false? specifically setSaved(false), B timer pending); A resolves and setsSaved(true); leave before B's 2s timer; Leave skips saving B, unmount cancels B timer. DB remains A, UI had said Saved for B. Browser back/closing before debounce also drops latest unsaved notes without any flush.
- Affects admin teacher notes and student private notes; history/data-loss risk. Other role's independent notes must remain unchanged.
- Fix track edit/save version or last-saved text, serialize saves, and await flush before app navigation; warn on external unload. Mechanical, Medium effort, High confidence. Add controlled delayed-save scenario before implementation.

### C-03 High — newly created inline topic cannot be selected in open Post dialog
Evidence **Traced**.
- components/classroom-post-dialog.tsx:252 snapshots incoming topics into `localTopics`; setter never used anywhere.
- :256-263 `createTopic` succeeds then router.refresh() updates props, but existing mounted TopicSelector retains initial localTopics; :278 maps stale localTopics.
- lib/actions.ts:1123-1134 returns newly created id and revalidates classroom. The caller discards returned id instead of appending/selecting it.
- Sample: open New Assignment with no topics; click New, create Algebra; toast says Topic created; topic list still only No topic. Save assignment: topic_id null, assignment lands in No topic, though Algebra exists in classroom after refresh. Closing/reopening dialog remounts and works.
- Fix derive options directly from topics or append returned topic and set selected id; avoid unnecessary copy. Mechanical, Small effort, Certain confidence.

### C-04 High — calendar's Delete silently performs cancellation, including on completed/billed classes
Evidence **Traced**.
- components/schedule-calendar-wrapper.tsx:223-228 labels toolbar button Delete, wired to handleDelete.
- :139-148 calls cancelClassQuick, not imported deleteClassQuick; opens reschedule prompt. Button has no status gate (unlike Cancel button which requires scheduled at :372).
- Contrast ordinary Cancel path :127-137 is identical. User expecting removal keeps a canceled record instead. Completed/billed classes can be changed to canceled, creating downstream invoice/history conflicts (backend auditor should link exact cancellation behavior).
- Fix requires policy: rename icon/title to Cancel and gate legal states, or wire actual deletion with explicit confirmation and billing-history protections. Do not decide destructive-delete policy from icon alone. Judgment, Small/Medium effort, Certain confidence.

### C-05 High when JaaS configured — calendar Copy Link takes student to a different meeting provider
Evidence **Traced**, conditional on JaaS configuration; external video not executed.
- components/schedule-calendar-wrapper.tsx:164-168 copies `https://meet.jit.si/${meeting_room}` and :294 label likewise.
- app/meeting/[classId]/page.tsx:52-62 signs JaaS JWT when configured and passes jaasRoomName(cls.meeting_room); lib/jaas.ts:78-81 prefixes APP_ID; components/jitsi-meeting.tsx:40-43 selects 8x8.vc when JWT present.
- Sample tutor joins `/meeting/1` in JaaS, sends calendar Copy Link to student; student joins unrelated free meet.jit.si room rather than tutor's JaaS room. Canonical authenticated app `/meeting/1` URL would preserve provider and auth.
- Fix copy app meeting route with absolute origin; preserve student ownership validation. Mechanical, Small effort, Certain conditional confidence.

### C-06 Medium — Class reminders toggle promises a feature that is not implemented
Evidence **Traced** (repo-wide search: only Notification constructor is this one-off confirmation).
- components/notification-toggle.tsx:17-25 requests permission and creates a single immediate notification saying reminders enabled.
- :33-39 advertises Get notified before upcoming classes; no subscription, reminder scheduler, service worker or interval connects permission to upcoming lessons.
- Sample enable, wait until class: no reminder fires. This differs from stored in-app inbox notifications and must not be conflated with them.
- Fix either implement scheduling/delivery policy (when/how while browser closed), or remove misleading reminder promise and label permission accurately. Judgment; feature implementation Medium, copy correction Quick; High confidence.

### C-07 Medium — scheduling default uses UTC text in local datetime input
Evidence **Executed** for expression with fixed Malaysian wall time; downstream semantics **Traced**.
- components/schedule-class-dialog.tsx:40-42 `Date.now()+1h -> toISOString().slice(0,16)`.
- With now Nov12 08:00 KL expression yields input `2026-11-12T01:00`; expected one hour ahead local `09:00`. Browser displays 01:00 (7h earlier than current time). Under UTC server's current naive parsing, input happens to store correct absolute +1h while user sees wrong value; do NOT treat that accidental cancellation as correct. Root backend fix must change both sides together.
- Recurring dialog :48 uses UTC date for today's default, previous local day before08:00 KL.
- Fix explicit local/business timezone formatting + server parse contract. Mechanical, Small effort, Certain confidence.

### C-08 Medium — numeric grading range is never enforced
Evidence **Traced**; coordinate with backend finding to avoid double counting.
- components/classroom/grade-submission.tsx:62-69 sets min0/max maxPoints, but not inside form and button :90 invokes handler directly.
- :31-39 sends any nonblank string. No checkValidity call, and lib/actions.ts:1155-1171 directly stores grade without reading maximum points.
- Sample max100, admin types999 or -10 and clicks Return; grade is stored/displayed to student as999/100. HTML input constraints do not validate standalone onClick requests.
- Fix enforce numeric/range validation against server-owned post maximum; show returned validation errors; retain letter grades when no max per current intent. Mechanical for numeric max, otherwise judgment on extra credit. Small effort.

### C-09 Medium/Inferred — pending flags are unreliable for async work under React18
Evidence **Traced** in installed React18.3 source; app's actual Next App Router React runtime should be browser-verified before treating as confirmed runtime failure.
- All mutation dialogs rely on startTransition(async()=>await action(...)) and disabled=isPending; e.g schedule-class-dialog.tsx:45-49,152; add-student-dialog.tsx:32-39; reschedule-request-dialog.tsx:36-46; submission-form.tsx:81-103.
- Installed node_modules/react-dom/cjs/react-dom.development.js:16499-16515 calls callback() without awaiting and queues setPending(false) before callback. React18 transition doesn't encompass async network lifetime. Next's bundled experimental React may differ; don't claim browser reproduction without testing.
- Separate explicit saving state/useFormStatus and server idempotency required to ensure duplicate clicks cannot create duplicate records (root server duplicates separate finding).

## Lower priority observations (avoid inflating report)
- CopyLinkButton :25-28 and share-token-button :27-29 show Copied before clipboard promise success; blocked clipboard yields false success (Traced, Low).
- ShareTokenButton :9 snapshots existingToken and never syncs props; another device revocation can leave UI copying revoked token until remount (Traced; expected token revocation access still backend-enforced; Low).
- Jitsi script hardcodes JAAS_APP_ID at components/jitsi-meeting.tsx:13 though signing uses configured JAAS_APP_ID. Configuration portability issue; current production app ID unknown, so conditional only.
- Grade/feedback form snapshots props into useState (:27-28): remote grade changes won't reset text, so stale form can overwrite another admin's edits. Version/conflict handling absent; coordinate backend concurrency finding.
- Broad missing local catches on mutations route action errors to global error page (data entry interrupted), rather than per-form recoverable errors. GenerateInvoiceDialog is exception with catch/setError. Not every missing catch merits separate finding.
- ScheduleCalendar legacy component is not used by current app (`rg ScheduleCalendar`); inactive backup examples not shipped as .tsx, no finding of runtime risk merely because dead artifact exists.

## Component/action inventory

All current data-changing calls are server actions; no React Query/SWR caches in these files. router.refresh() is local to acting browser; no cross-user realtime subscription. UI-only state includes sidebar localStorage, selected dates/month, open dialogs, topic selection, notes dirty flags, clipboard feedback, chart rendering. All data displays are props from server pages; screen catalog must identify server queries.

| File/group | Visible surfaces/actions | Mutation/read and freshness |
|---|---|---|
| Nav.tsx | Admin sections, mobile drawer, collapse, Logout | logoutAdmin form; pathname live; sidebar stored localStorage |
| portal-nav.tsx | Student dashboard/schedule/classroom/notes/notifications/profile; logout; unused parent-role branch | logoutStudent; route props |
| parent-nav.tsx | Token dashboard,attendance,schedule,reports,invoices; mobile nav | no writes; token base path |
| add-student-dialog.tsx | Add student modal, credentials explanation | createStudentQuick; refresh + push detail; HTML required name/email only |
| edit-student-dialog.tsx | Edit name/rate/contact/active modal | updateStudentQuick; refresh; uncontrolled defaults |
| schedule-class-dialog.tsx | New one-off date/time/duration/trial | createClassQuick; refresh; required student/date; no positive duration min |
| recurring-schedule-dialog.tsx | Multiple weekdays,custom interval,date bounds | createRecurrenceQuick; refresh; no checkbox required group or numeric bounds |
| generate-invoice-dialog.tsx | Student,period,notes; inline action error | generateInvoiceQuick; refresh + invoice navigation |
| schedule-calendar-wrapper.tsx | All calendar views,event details,add-slot dialog,attendance,Cancel/Delete,reschedule,meeting/copy | createClassQuick,markAttendance,cancelClassQuick,rescheduleClassQuick; local refresh; stale selectedClass snapshot while dialog open |
| schedule-calendar.tsx | Legacy monthly calendar,list,counts | props only; unused current route |
| cancel-dialog.tsx | Inline cancel reason + optional reschedule form | cancelClass bound; no pending/confirmation beyond inline open |
| reschedule-request-dialog.tsx | Student preference times1-3/reason | createRescheduleRequest; toast/result handling + refresh |
| reschedule-actions.tsx | Admin approve/reject + time/note | approveRescheduleRequest/rejectRescheduleRequest; refresh; result handling |
| post-class-report-dialog.tsx | report query opens modal;topics/homework/performance/rating | saveReportQuick; toast,refresh; no existing report prefill; retained saved state until remount |
| meeting-room.tsx | video,notes toggle/autosave/manual,copy,leave | saveClassNotes by scope; dirty/debounce state; navigation |
| jitsi-meeting.tsx | script/iframe lifecycle/loading/error/external fallback | third-party video; no DB write; 10s timeout only checks iframe existence |
| classroom-post-dialog.tsx | New/edit material/assignment/announcement;delete confirmation;inline create topic | createPostAction,updatePost,deletePostAction,createTopic; refresh; topic stale copy |
| classroom/classroom-tabs.tsx | Classwork topics/collapse/status and admin Grades tab | props; assignment Missing compares client clock; submission status derived graded_at/submitted |
| classroom/topic-manager.tsx | Create/rename/delete topic inline/dropdown | createTopic/renameTopic/deleteTopic; refresh; delete no confirm |
| classroom/submission-form.tsx | Student content/link/file upload,Turn in | POST/api/upload then submitAssignment; upload errors local;10MB client limit |
| classroom/grade-submission.tsx | Admin Return/update grade,feedback;submission card | gradeSubmissionAction; refresh; state snapshots |
| classroom/classroom-banner.tsx | Student name/subject | props only |
| share-token-button.tsx | Generate/copy/revoke parent link | generateShareToken/revokeShareToken; own token state; no pending lock |
| notes-table.tsx | Search,expand,delete note | supplied deleteAction(noteId,studentId); server props; created_at parsed browser zone |
| report-row.tsx | Expand report,link class | props,local expansion |
| notification-bell.tsx | badge + inbox link | server unreadCount prop; no polling |
| notification-toggle.tsx | Request browser permission | one-off Notification only |
| attendance-chart.tsx | Present/late/absent ring | present/total%; props; total includes supplied denominator |
| revenue-chart.tsx | Paid/outstanding bars | props; month-only tick labels; no writes |
| dashboard-actions.tsx | Compose schedule/add student/invoice dialogs | calls via modal components |
| copy-link-button.tsx | Clipboard absolute/relative link | browser-only; immediate success |
| copy-login-button.tsx | Clipboard credentials + URL | awaits clipboard; no error UI |
| export-button.tsx | CSV download | calls supplied getData; Blob link; no pending/error |
| whatsapp-share.tsx | User initiated external WhatsApp compose | window.open wa.me; no automatic send |
| empty-state.tsx,form-field.tsx,page-header.tsx | Layout/form primitives | props only |
| layout-shell.tsx,main-wrapper.tsx | Sidebar context/localStorage,route margins | browser-only UI state |
| examples/c-event-calendar-1.tsx.bak | Inactive vendor demo incl resource/timezone settings | backup, not imported/shipped; mock local events |

## Policy questions

1. Calendar trash icon: should it cancel (retain history) or truly delete? Current implementation cancels; align language and guards with chosen behavior. Affects canceled billing line retention and reschedule workflow.
2. Reminder toggle: actual scheduled browser reminders desired, or remove promise? If actual, define lead time and whether tab/browser may be closed.
3. Numeric max points: is extra credit allowed? Current min/max UI suggests no, but backend permits any string. Enforce standard [0,max] if no extra-credit policy.
4. Meeting copy link should use authenticated app route; this preserves existing Q3 requiring meeting login. No need to revisit prior credential/test decisions unless explicitly requested.

## Scenario proposals

- SC-C01 Executed helper: KL invoice defaults Nov1-Nov30 => actual Oct31-Nov29 (Fail). Need end-to-end fixture with Oct31/Nov30 to elevate downstream billing trace.
- SC-C02 Traced: teacher notes A pending + B edit + A ack + Leave => B lost (Fail).
- SC-C03 Traced: open Post > inline create Algebra > select list => Algebra absent until remount (Fail).
- SC-C04 Traced/Policy-dependent: Delete completed calendar lesson => canceled rather than removed; billed snapshot consequence coordinate backend.
- SC-C05 Traced/conditional: tutor in JaaS + schedule copied free link => separate meeting (Fail if configured).
- SC-C06 Traced: enable reminders then wait for class => no scheduler exists (Fail against UI promise).
- SC-C07 Executed expression: now08:00 KL +1h default =>01:00 input instead09:00 (Fail).
- SC-C08 Traced/Policy-dependent: numeric999 of100 Return => saved (Fail absent extra credit policy).
- SC-C09 Inferred: click mutation twice while async action pending => test actual Next runtime before claim.

## Files read
components/Nav.tsx
components/add-student-dialog.tsx
components/attendance-chart.tsx
components/cancel-dialog.tsx
components/classroom-post-dialog.tsx
components/classroom/classroom-banner.tsx
components/classroom/classroom-tabs.tsx
components/classroom/grade-submission.tsx
components/classroom/submission-form.tsx
components/classroom/topic-manager.tsx
components/copy-link-button.tsx
components/copy-login-button.tsx
components/dashboard-actions.tsx
components/edit-student-dialog.tsx
components/empty-state.tsx
components/examples/c-event-calendar-1.tsx.bak
components/export-button.tsx
components/form-field.tsx
components/generate-invoice-dialog.tsx
components/jitsi-meeting.tsx
components/layout-shell.tsx
components/main-wrapper.tsx
components/meeting-room.tsx
components/notes-table.tsx
components/notification-bell.tsx
components/notification-toggle.tsx
components/page-header.tsx
components/parent-nav.tsx
components/portal-nav.tsx
components/post-class-report-dialog.tsx
components/recurring-schedule-dialog.tsx
components/report-row.tsx
components/reschedule-actions.tsx
components/reschedule-request-dialog.tsx
components/revenue-chart.tsx
components/schedule-calendar-wrapper.tsx
components/schedule-calendar.tsx
components/schedule-class-dialog.tsx
components/share-token-button.tsx
components/whatsapp-share.tsx
