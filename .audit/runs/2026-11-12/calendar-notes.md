# Calendar and UI audit — 2026-11-12

Scope: fully read every tracked file under components/ui and components/reui (37 files, about 11,000 lines). No application source, tests, dependencies, or existing `.audit` files modified. Also read relevant ScheduleCalendarWrapper integration. Evidence below distinguishes SSR/store execution from browser tracing. Real browser drag, responsive layout, and browser accessibility behavior have not been executed by this sub-auditor.

## Architecture and inventory

- UI primitives: Base UI for alert-dialog, badge/useRender, checkbox, dialog, input, progress, separator, sheet; Radix for avatar, dropdown-menu, label, popover, scroll-area, select, switch, tabs, tooltip; button is a Radix Slot adapter also accepting a limited custom render prop. Calendar wraps react-day-picker v10.
- Calendar engine: event-calendar.tsx owns a useSyncExternalStore store with controlled/uncontrolled events/date/view/selection/interactions. Reads occurrence index rebuilt on event identity/range/zone/order/expander change. Mutation funnel calls onEventUpdate and onEventsChange synchronously; no DB itself.
- Views: month week rows/day cells/overflow, week/day/N-days time grid, agenda, optional resource day grid. Month/week/day/days/agenda are available by default; resource requires resources or explicit view list. Only active app consumer found is ScheduleCalendarWrapper in admin schedule. Student/parent schedules use their own rendered lists.
- Actions: Today, prev/next, view switch, day-count presets; event click/double-click, select event, drag move, resize start/end, drag-create; overflow popup. Optional go-to-date picker is exported but not composed by default. Public imperative API supports set/add/update/remove events, overlap lookup, selection, navigation, scroll. No actual production use found for resource view, raw RRULE, off-day toggles, or asynchronous data adapters.
- Values/formulas: event occurrence duration = end-start; timed overlap uses half-open [start,end); minimum packing slot 30 min; month lanes merge per-occurrence day segments. Default display time zone browser Intl zone. Recurrence expands daily/weekly/monthly/yearly with exclusions/additions, max 1,000 visible occurrences and 10,000 periods, supports COUNT/UNTIL. All-day records require display-zone midnights. No financial values here.
- Dependency reachability: all non-relative external imports in these directories have installed manifest dependencies. No missing DnD/RRULE package import found. Most vendor files start `@ts-nocheck`, so API integration mismatches survive TypeScript checks.

## Findings

### CAL-1 — High — Enabled calendar gestures discard changes (active app integration)

Evidence: **Executed (store behavior) + Traced (UI→DB path)**. Mechanical, Small fix. Affected actor/surface: admin schedule; downstream student/parent schedule remains old because no DB write occurs.

ScheduleCalendarWrapper supplies controlled `events`, onSlotClick and onEventClick only (components/schedule-calendar-wrapper.tsx:184-188); it has no onEventUpdate, onEventsChange, onSelectSlot, interactions overrides, nor per-event readOnly overrides. Calendar defaults drag/resize/selectSlot all true (components/reui/event-calendar/event-calendar.tsx:65-69). Store setField sees controlled events and does not write internal events (event-calendar.tsx:524-540); its only callback is absent. Pointer drop calls applyProposedUpdate and reports success (event-calendar-dnd.tsx:902-920), which always returns true if optional onEventUpdate does not reject (event-calendar.tsx:572-602). Drag-create suppresses trailing click then only calls optional onSelectSlot (event-calendar-dnd.tsx:876-887), so a dragged range opens no app dialog.

Scenario: admin drags lesson 1 from Nov 12 09:00 to Nov 13 09:00. Executed controlled store proposal returns `true`, but getEvent('1').start remains Nov 12. Default enabled interactions verified. DB remains unchanged by trace: no registered persistence callback. Resize and drag-create have same integration root cause. Workaround: use existing cancel/reschedule flow; use click to create.

Proposed fix: decide whether interactive dragging is intended. Either set interactions={{drag:false,resize:false,selectSlot:false}} to match supported click-only behavior, or implement async persistence and error/revert handling and onSelectSlot→dialog mapping. Do not call async server action as synchronous callback and assume false/Promise is handled: EventCalendarUpdateResult is synchronous. Add regression coverage for all three gestures and read back admin/student/parent schedules.

### CAL-2 — Medium — UI wrapper viewport contract breaks default calendar scrolling

Evidence: **Executed (SSR attribute mismatch) + Traced (scroll effects)**. Mechanical, Quick fix. Active in week/day/N-days and populated month overflow; resource implication dormant.

components/ui/scroll-area.tsx:17 renders Radix Viewport without `data-slot="scroll-area-viewport"`. Calendar expects exactly that selector in event-calendar-time-grid.tsx:147-149 and event-calendar-dnd.tsx:172. SSR verified Radix viewport attribute exists but expected data-slot absent. Thus initial scrollToHour=7 (event-calendar.tsx default view config) and imperative scrollToTime cannot find viewport; autoScroll sees surface.viewport null and returns (event-calendar-dnd.tsx:769-772). Month overflow ScrollArea max height also depends on **:data-[slot=scroll-area-viewport] at event-calendar-month-view.tsx:1273, so that max-height class never targets viewport.

Scenario: admin switches schedule to week. Time grid should initially scroll toward 07:00; viewport?.scrollTo is never called because viewport null, leaving midnight at top. Drag at bottom cannot auto-scroll. With many overflow events, popover may grow unbounded rather than capped. Browser pixel sizing not executed; DOM selector absence is executed and deterministic.

Fix: align wrapper and consumers by adding the stable data-slot contract to the viewport, or use the existing Radix data attribute consistently in all consumers. Recheck initial scroll, manual-scroll+drag, auto-scroll, and long overflow popover.

### CAL-3 — Medium — Mixed Base UI/Radix trigger APIs silently drop calendar nav configuration

Evidence: **Executed (SSR)**, Certain. Mechanical, Small. Active view switcher; optional date picker same root cause dormant.

components/reui/event-calendar/event-calendar-nav.tsx:311-325 passes `render` to Radix DropdownMenuTrigger and TooltipTrigger, but components/ui/dropdown-menu.tsx:10 and tooltip.tsx:12 directly export Radix primitives (which require asChild composition). The intended Button contains its style, aria-label="Select view", and data-slot on lines 315-320. SSR output is an unstyled Radix button containing visible 'Month' text and icon, with `render="[object Object]"` leaked into DOM. It has no intended data-slot and no explicit 'Select view' accessible label, and TooltipTrigger is never rendered. The menu itself can still open; this is not an inaccessible/empty button claim. Month text supplies an accessible name, though less descriptive than intended. DatePicker uses same unsupported render prop at nav.tsx:474 onward if a consumer later mounts it.

Fix: use Radix asChild nesting around a single actual Button (and TooltipTrigger) or standardize primitives; remove `@ts-nocheck` from integration after compatibility correction so future prop drift is caught. Verify menu selection, hover/focus tooltip, and custom button classes.

## Dormant library defects / future backlog (not active production bugs)

- canDropEvent rejection is presentation only: dnd.tsx:667 sets valid=false but onPointerUp:902 unconditionally commits; applyProposedUpdate:572 checks only onEventUpdate, not canDropEvent. Current app never supplies canDropEvent, and controlled events don't persist anyway; do not present this as current scheduling conflict enforcement bypass. Guard commit when drag.valid false and revalidate latest proposal if adopting callback later.
- Resource all-day create/drop does not carry resource identity (resource-view.tsx:380 comment explicitly notes this; dnd.tsx:484-492 whole-day branch lacks resourceId). Resource view not configured by active app.
- RRULE monthly anchor without BYMONTHDAY clamps day 31 to month end rather than RFC skipping invalid months (recurrence.tsx:385). Code explicitly chooses clamping; current app recurring sessions are DB-generated via actions, not these rules. Classify policy/standards compatibility only if raw RRULE feature gets used.
- Agenda isToday helper reads new Date without midnight ticker unlike useEventCalendarDay, so an agenda left open across midnight may highlight yesterday until unrelated rerender (agenda-view.tsx:85-87). Low severity; current agenda reachable via switcher. No claim of incorrect persisted dates.
- Module-global gestureConsumers means removing one calendar while another calendar remains mounted won't necessarily cancel departing calendar's gesture; app currently mounts one calendar.

## Validation artifacts

`/workspace/scratch/audit-calendar-check.cjs` is a self-contained no-DB SSR/store probe. Run `node /workspace/scratch/audit-calendar-check.cjs`; results saved at `/workspace/scratch/audit-calendar-check-results.json`. It exercises actual installed React/Radix/Base UI code by in-memory TypeScript transpilation, without editing sources. React warns useLayoutEffect does nothing on server; no browser hydration result implied.

## Coverage limits

Read all files, but did not interact with a live browser in this subtask. SSR is not proof of drag mouse event execution. No source files changed, no actual class data touched, no external side effects. Pure helpers inspected by trace; no exhaustive recurrence/date/DST runtime matrix claimed. Main application stores timezone-free dates, so audit root should combine with format/actions findings.

## Files fully read
components/reui/event-calendar/event-calendar-agenda-view.tsx
components/reui/event-calendar/event-calendar-content.tsx
components/reui/event-calendar/event-calendar-dnd.tsx
components/reui/event-calendar/event-calendar-event.tsx
components/reui/event-calendar/event-calendar-i18n.tsx
components/reui/event-calendar/event-calendar-lib.tsx
components/reui/event-calendar/event-calendar-month-view.tsx
components/reui/event-calendar/event-calendar-nav.tsx
components/reui/event-calendar/event-calendar-recurrence.tsx
components/reui/event-calendar/event-calendar-resource-view.tsx
components/reui/event-calendar/event-calendar-time-grid.tsx
components/reui/event-calendar/event-calendar-types.tsx
components/reui/event-calendar/event-calendar.tsx
components/reui/icon-stack.tsx
components/ui/alert-dialog.tsx
components/ui/avatar.tsx
components/ui/badge.tsx
components/ui/button.tsx
components/ui/calendar.tsx
components/ui/card.tsx
components/ui/checkbox.tsx
components/ui/dialog.tsx
components/ui/dropdown-menu.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/popover.tsx
components/ui/progress.tsx
components/ui/scroll-area.tsx
components/ui/select.tsx
components/ui/separator.tsx
components/ui/sheet.tsx
components/ui/skeleton.tsx
components/ui/switch.tsx
components/ui/table.tsx
components/ui/tabs.tsx
components/ui/textarea.tsx
components/ui/tooltip.tsx
