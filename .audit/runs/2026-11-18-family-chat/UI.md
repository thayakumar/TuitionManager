# Family chat UI verification — 18 November 2026

## Implemented surfaces

- Tutor `/chats`: searchable student inbox with latest-message previews and numeric unread badges; selecting a room opens its conversation.
- Student `/portal/student/{id}/chat` and parent `/share/{token}/chat`: the same private family conversation. Each page authorizes its actor before rendering.
- Shared chat: own messages right, other participants left, profile icons/photos, roles, timestamps, day separators, replies, edited indicators, removal tombstones and read receipts.
- Rich-text composer with private attachments and pasted images, progress/error/pending states, retained drafts on temporary failure, idempotent unchanged retries and explicit removal confirmation.
- Chat navigation and unread polling for tutor, student and parent; Overview entry. Phone tutor inbox switches between the room list and thread.
- Visible-thread polling every five seconds refreshes latest messages plus all loaded message IDs in bounded batches, so edits/removals/read receipts update too. Earlier-message pagination preserves existing history. Hidden tabs pause polling.

## Executed evidence

The browser harness `scratch/approved-repairs/browser/family-chat-ui.cjs` runs Chromium against the actual production build and isolated SQLite at localhost:4686. Tutor, student and parent use separate browser contexts. File transfers use the app endpoint and a controlled Google/Apps Script provider with real PNG bytes; no production family records or Drive files are created.

Eight scenarios pass:

1. Tutor searches the inbox and sends a message visible to student and parent; bubble ownership reverses by viewer.
2. Student replies with a quoted message; both other participants receive it through polling.
3. Parent sends under the distinct parent role; read receipts appear after the other participants view the thread.
4. Student edits then removes their message; both other views update and retain the removed-message marker.
5. Parent uploads an image attachment; tutor, student and parent expand it in the page. The stored attachment contains no parent token. An attachment-only message has an empty body and does not repeat the previous message.
6. Student leaves the room; a new parent message increments the navigation badge, and opening the room clears it.
7. All three role views fit a 390px phone without horizontal overflow; tutor can return to the inbox and reopen the room. Screenshots retained here.
8. No unhandled browser runtime errors occur.

During the first walkthrough, inspecting saved rows exposed stale composer text being resurrected when the editor was locked/unlocked. `setEditable` now suppresses update emission for editability changes; the final browser run explicitly waits for the composer to clear and checks the attachment-only saved body. TypeScript checks passed after the fix.

This is an app-based family chat. The walkthrough does not claim WhatsApp interoperability, encrypted messaging, voice/video calls or real production Google storage verification.
