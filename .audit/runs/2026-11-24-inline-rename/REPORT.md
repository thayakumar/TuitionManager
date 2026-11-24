# Inline document/sheet rename

24 November 2026: the admin full-page file header now has an editable filename. Enter/checkmark saves; Escape/X cancels. Pending/error states and retry are visible. Editor content stays mounted and its export filename updates without refreshing. Student management permissions remain unchanged.

Verification: eight existing document service tests passed; root typecheck, Office build and Next.js production build passed after correcting an initial JSX syntax error. Seven browser workflow groups passed with no page errors: Docs and Sheets rename persistence, retained editor/content and updated export names, blank-name rejection/cancel, injected503 failure/retry, mobile sizing, and forbidden student rename. Tests used isolated local data, not production files.
