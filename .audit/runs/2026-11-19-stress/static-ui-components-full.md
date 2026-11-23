# Full static component reading

Read CLAUDE.md and the complete text of all 64 files below, with numbered lines in 27 bounded outputs (each at most 23,000 source characters). No source edits, tests, builds, app-file reads, or runtime verification performed by this worker.

Explicit omissions: components/reui/** (vendored), components/ui/** (standard components excluded by assignment; unchanged status supplied by assignment, not independently established). Parent already fully read components/use-chat-outbox.ts, components/note-save-queue.ts, components/post-comments.tsx, components/notification-read-link.tsx, components/lesson-action-form.tsx, components/rich-text.tsx, components/family-chat-unread.ts; not reread or credited to this worker.

## Actionable findings

P2 — Family chat can apply an old room snapshot after switching rooms during older-message refresh. Traced: components/family-chat.tsx:90 checks `live` after the first fetch; :92–95 then performs additional awaited requests for each additional 200 loaded IDs; :97 unconditionally merges the response into current messages and updates shared latest/loading state. Cleanup :106 sets live=false and aborts, but fetch may already have resolved while response JSON is pending, and there is no post-await live/selected check. Room changes clear messages at :80. A delayed response from the old room can therefore populate the new room. Recheck live and selected room after every awaited stage and immediately before state updates, and capture refresh ID batches before awaits. Static trace only; reproduce with more than 200 loaded IDs and delayed second response. No server authorization bypass inferred.

P2 — Gradebook denominator uses mutable post maximum instead of the attempt snapshot. Traced: components/classroom/classroom-tabs.tsx:47–52 SubmissionInfo omits max_points; :872 and :875–877 display post.max_points beside an existing graded submission. In contrast components/classroom/submission-history.tsx:37–38 explicitly uses attempt.max_points when supplied and :64–65 renders that recorded maximum. Editing assignment points after grading can therefore show a different ratio in gradebook and submission history. Carry submission maximum snapshot in gradebook data and use it when rendering the graded score. Parent should trace page query projection before promoting this finding; app files intentionally outside this worker scope.

No critical security bug established in this component-only scope. Parent owns the separately identified PostComments delayed-load race.

## Auth and state observations

Client role flags, IDs, hidden fields and parent tokens select presentation/request scope; they do not establish authorization. Mutation and API enforcement remains the server boundary and was not independently read in this assignment. Parent token forwarding is explicit for chat, inline rich text and file previews (family-chat.tsx:25–27, attachment-preview.tsx:127–131). CopyLoginButton intentionally receives/copies a password (copy-login-button.tsx:8–21); ensure only authorized admin pages instantiate it.

SubmissionForm uses a synchronous submitting ref, retains successful uploaded attachment URL when submission fails, and waits for refresh; GradeSubmissionForm sends expected submission.version (grade-submission.tsx:48–54). History defaults collapsed. PostDialog guards attachment loading/error and failed uploads before save. MeetingRoom queues notes and keeps scoped session drafts, flushes explicit leave/home, with beforeunload warning; queue internals covered by parent. Whiteboard uses revision conflicts, same-origin/source message checks, and scoped session drafts. Its SPA home links do not flush pending edits, but effect cleanup retains drafts for later recovery; this is a recovery UX limitation, not established permanent loss. Diagnostic questionnaire serializes saves with retry request identity; workspace polling suppresses in-progress student snapshots. Navigation closes mobile menus on pathname changes.

## Exact full-read inventory (path: line count)

```text
components/Nav.tsx: 261
components/action-busy.tsx: 174
components/add-student-dialog.tsx: 208
components/attachment-preview.tsx: 312
components/attendance-chart.tsx: 70
components/brand-home-link.tsx: 75
components/cancel-dialog.tsx: 137
components/classroom/assignment-status.tsx: 33
components/classroom/classroom-banner.tsx: 14
components/classroom/classroom-tabs.tsx: 893
components/classroom/grade-submission.tsx: 179
components/classroom/submission-form.tsx: 264
components/classroom/submission-history.tsx: 122
components/classroom/topic-manager.tsx: 269
components/classroom-post-dialog.tsx: 753
components/confirm-action.tsx: 104
components/copy-link-button.tsx: 92
components/copy-login-button.tsx: 39
components/dashboard-actions.tsx: 60
components/diagnostics/questionnaire.tsx: 38
components/diagnostics/report.tsx: 24
components/diagnostics/workspace.tsx: 62
components/edit-student-dialog.tsx: 231
components/empty-state.tsx: 21
components/export-button.tsx: 53
components/family-chat.tsx: 197
components/form-field.tsx: 139
components/generate-invoice-dialog.tsx: 243
components/jitsi-meeting.tsx: 179
components/layout-shell.tsx: 33
components/lesson-status-badge.tsx: 24
components/main-wrapper.tsx: 27
components/meeting-room.tsx: 345
components/notes-table.tsx: 107
components/notification-actions.tsx: 60
components/notification-bell.tsx: 79
components/notification-toggle.tsx: 3
components/page-header.tsx: 33
components/parent-nav.tsx: 186
components/parent-report-table.tsx: 125
components/portal-nav.tsx: 148
components/post-attachments-input.tsx: 280
components/post-class-report-dialog.tsx: 232
components/rating-badge.tsx: 8
components/recurrence-manager.tsx: 218
components/recurring-schedule-dialog.tsx: 287
components/report-details.tsx: 39
components/report-row.tsx: 89
components/reschedule-actions.tsx: 279
components/reschedule-request-dialog.tsx: 151
components/revenue-chart.tsx: 196
components/rich-text-editor.tsx: 511
components/schedule-calendar-wrapper.tsx: 564
components/schedule-calendar.tsx: 261
components/schedule-class-dialog.tsx: 135
components/scheduling-fields.tsx: 457
components/share-token-button.tsx: 156
components/sign-in-shell.tsx: 78
components/storage-setup.tsx: 177
components/student-profile-form.tsx: 58
components/table-explorer.tsx: 90
components/whatsapp-share.tsx: 12
components/whiteboard-canvas.tsx: 512
components/workspace-header.tsx: 75
```
