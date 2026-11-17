# Excaliflow integration and persistence verification

## Source and adaptation

- Vendored Excaliflow from Shubhamsaboo/awesome-llm-apps, upstream path advanced_llm_apps/excaliflow/index.html, revision fba2c90c568b3a61d8080be5cee38ed6908d8779.
- Apache-2.0 license and attribution retained under public/vendor/excaliflow.
- Three original drawing fonts bundled locally, with Excalidraw/Excalifont/Cascadia license notices. External font stylesheet requests removed.
- Original drawing, animated arrows, text, shapes, freehand, templates, canvas tabs and import/export tools remain.
- New boards open empty. Vendor-wide localStorage persistence is disabled to prevent lesson/personal boards from mixing.
- A same-origin/source-checked parent bridge loads saved workspaces and emits changed workspace snapshots. Imports establish a new baseline, preventing save/poll loops.
- Mobile toolbar islands wrap; duplicate canvas-navigation buttons are hidden only where equivalent canvas menu/bottom-dock actions remain. The properties panel starts collapsed on phones and follows the actual toolbar height when opened.

## Save and collaboration model

WhiteboardCanvas uses authenticated GET/PUT endpoints, autosaves after an 800 ms pause, and polls every five seconds when its working copy is clean. Conditional GETs return 304 when the saved revision is unchanged.

Lesson boards allow the tutor and that lesson's active student to edit. Server-side revision checks reject stale saves. Simultaneous edits are handled by explicit version selection; this does not merge simultaneous changes or provide live cursors.

On conflict, the local drawing remains on screen. The user may download it, load the saved version, or explicitly replace the saved version with their own. Failed saves preserve a tab-scoped draft under a board-and-identity key. Navigation warns about unsaved work.

## Executed results

Seven browser checks passed on the isolated fake database, server port 4634:

1. Native workspace changes autosave and unchanged boards do not keep saving.
2. A clean student workspace receives tutor changes; unchanged polls return 304.
3. Concurrent changes produce a conflict, retain local student work, and allow downloading it.
4. Load saved version resolves the conflict without writing over the server.
5. Failed saves retain a draft through reload; Retry saves it and clears the draft.
6. Save my version explicitly replaces the current saved workspace after a conflict.
7. No unhandled browser runtime errors.

Evidence: whiteboard-sync-results.json, whiteboard-conflict.png.

Eight adapted upstream geometry/tool/workspace verification checks also passed. Adaptations only replace upstream's expected demo startup with an explicit template load and verify that shared localStorage stays disabled. Rendering, arrows, binding, typography, shortcuts, imports and multi-canvas behavior were exercised.

## Error found and corrected

The first save test exposed an Origin check comparing the browser's public host with Next's internal request URL. The endpoint now derives the expected public host/protocol using forwarded headers; API tests cover that deployment shape. The complete browser save/sync/conflict suite passed after this fix. No production records were changed.
