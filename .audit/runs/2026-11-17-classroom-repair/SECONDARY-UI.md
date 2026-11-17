# Requests, navigation, schedule and report/table corrections

## Implemented

- New request cards show the student and request action, without all proposed slots/reasons filling the page. Approve/Reject opens a review dialog with the original lesson and reason; approval also includes all suggestions and the existing custom-date option.
- Past request cards show original class, approved time (or a clear missing-record fallback), reason and tutor note. Unused proposed slots are absent. Approved status uses green; declined uses neutral grey.
- Notification titles themselves are links. Clicking still marks the notification read and updates the unread count before routing. Separate View actions were removed. Student destinations remain scoped to that student's portal.
- Student My Schedule groups lessons into collapsible months: current month first and expanded, future months in ascending order, then recent-to-old past months. Other months start collapsed. An empty current month remains a useful starting point when other records exist.
- Student classroom navigation/backlink says My Classroom.
- Parent class report summaries now use four real table cells corresponding to the four headers. Report expansion is a separate full-width detail row, preventing the previous single-colspan/grid layout from misaligning data. Full-report text remains searchable while collapsed. Expanded report details render only when opened, reducing initial DOM size.
- Admin and parent invoice detail item tables disable the shared table explorer, so all items show with no search, column filter or pagination controls. Invoice lists remain searchable.
- Request resolution and notification navigation use the shared blocking action feedback hook.

## Verification

Combined TypeScript validation passed after these changes. Final browser results and screenshots will be written to `secondary-ui-results.json` in this directory. The browser harness uses isolated local SQLite records and tests compact pending/history layout, review/custom date controls, both roles' title-navigation/read state, month collapse/mobile width, parent report alignment/expansion/filtering, and both invoice detail variants.
