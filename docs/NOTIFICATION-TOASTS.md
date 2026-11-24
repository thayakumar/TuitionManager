# Notification popups

New notifications appear at the top right while TuitionHub is open. The visible tab checks every five seconds and checks again on focus. Admins and students receive their own notifications and incoming family-chat messages. Parents receive messages from their own family chat.

1. Click a popup to open its related page. A notification is marked read on a best-effort basis; chat read state follows the chat page.
2. Click X or let the popup close after eight seconds to leave the item unread.
3. Refreshing or signing in does not replay existing unread items. The inbox badge still includes them.
4. Tabs share numerical delivery watermarks to prevent duplicate popups. Notification text is not stored in these watermarks.
5. Messages from yourself or the conversation currently being viewed do not produce a chat popup.
6. From a meeting, document editor or whiteboard, the popup opens the related page in another tab to preserve the teaching workspace.

These are in-app alerts, not browser push notifications while the website is closed. No new hosting, database migration or secrets are required. Badges and popups share one feed.

## Contrast and sound

Notification cards use a dark charcoal surface with white text and an orange icon. A quiet two-note chime accompanies a newly displayed batch, with a short cooldown to avoid overlapping sounds. Duplicates, initial unread history and messages in the chat being viewed stay silent. The chime is generated locally without an audio download. Browsers allow it only after a click/tap or keypress on the site; unsupported or blocked audio does not prevent visual notifications.
