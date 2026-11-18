# Enter to send in chats

Plain Enter sends family-chat messages and classroom post comments. Shift+Enter keeps a new line. The behavior is opt-in on the shared rich-text editor, so lesson notes, assignments and post editors keep their standard Enter behavior. Ctrl/Alt/Meta-modified keys and IME composition are not intercepted for sending. The latest callback is read through a ref, preserving current draft/edit/pending state, and each existing send handler continues to validate content and upload state.

Executed: production build and TypeScript passed. Nine isolated browser scenarios passed: each of tutor/student/parent family chat sends once, clears the composer and retains focus; Shift+Enter and composing Enter do not send for all three roles; tutor/student classroom comment Enter sends while empty/Shift+Enter/composing Enter do not; no unhandled browser errors. Tests use isolated SQLite, with no production messages created. Results: browser-results.json.
