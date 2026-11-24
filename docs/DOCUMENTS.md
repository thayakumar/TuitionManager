# Documents and spreadsheets

Docs remains on CasualOffice. New editable spreadsheets use the self-hosted Gridcraft 0.19.1 browser release. Existing CasualOffice spreadsheet snapshots retain their original editor, and view-only spreadsheets use the existing preview engine. The retained CasualOffice packages are: `@casualoffice/docs@1.4.2` and `@casualoffice/sheets@0.20.0`, pinned in the isolated `office-editor/package-lock.json`. The Word surface uses the React SDK; Sheets uses its published self-contained iframe runtime and the documented snapshot/export API. Editors load only on the full-page file route, keeping their bundles out of dashboards/classrooms. Generated assets are served by TuitionHub, not a public demo.

## Use

- Admin: Documents → New document / New sheet. Grid/table preference is remembered in the browser. Search titles and saved preview text; filter file type/student, sort name/edited date and paginate20 files per page.
- Create from Documents: private, standalone file; no class link. Manage access to grant active students view/edit permission.
- Meeting → Documents: opens the lesson library in a new tab. Creating there automatically links the lesson and grants its student edit access. Linked files also appear on class details, student notes and the general library. Simply opening an existing file does not change its lesson link.
- Files open in a full-page editor in a new tab. Home returns to the correct workspace; the library shortcut returns to the role’s Documents page.
- Rename, manage access, duplicate and archive/restore from each file’s menu. A duplicate contains the last saved work and is private/standalone. Archiving preserves data and removes student access until restored.
- Students: My documents shows only explicitly shared files. Inactive students cannot read or save. Parent share links do not grant document access.

## Saving and concurrency

Live collaboration is deliberately disabled at the owner’s request; no VPS or new hosting service is needed. One person/tab may edit a file at a time. Other viewers can read/download the last saved version and retry editing later. A 90-second server lease renews every25 seconds and is released on page exit; crashed tabs expire. Every save also checks the latest revision and permissions. Access changes invalidate editing leases immediately. A conflict never overwrites newer work; the editor retains changes for download.

Autosave runs about every2 seconds after document edits and for Gridcraft spreadsheet checks; legacy spreadsheet snapshots are checked every1.5 seconds. Save now and standard editor shortcuts are available. Pending/error states and a retry action make failures visible; unsaved work prompts before closing. DOCX bytes and spreadsheet snapshots live in Turso/libSQL, independent of Google Drive. Previews are generated from saved content, not uploaded screenshots. Grid previews show a paper/grid representation of those excerpts, rather than a full-fidelity rendered thumbnail.

Snapshots travel in bounded chunks for larger files, and reopening reads revision-bound chunks to stay below response limits; there is no explicit total-file cap in the snapshot service. Hosting/database resource limits still apply. Incomplete staged chunks never replace a saved file and expire after30 minutes. Exports produce `.docx` / `.xlsx` downloads through the editor SDK. Live synchronization and document version-history UI are not enabled.

## Build

`npm run build` installs the isolated editor lockfile using `npm ci --ignore-scripts --include=dev`, builds the browser bundle, prepares Sheets runtime/workers and local icon fonts, then builds MCP and Next.js. Build tools are explicitly included even when the host sets `NODE_ENV=production`. Native inference installation scripts are skipped because AI is disabled. No AI credentials are required. Generated `public/office-editor/` assets and nested node_modules are ignored. Use `node scripts/build-office.mjs --skip-install` for a local asset rebuild after dependencies are installed. Restart a production-mode Next server after rebuilding public assets; its public-file inventory is established at startup.

Pinned upstream archives contain licence notices; `scripts/build-office.mjs` carries them to `/office-editor/licenses/`. Local font URL substitutions are explicit distribution modifications. Underlying Apache/MIT/SIL notices must be retained. See the pinned repositories and package notices for attribution.

Schema10 adds document metadata/content, explicit grants, editing leases and staged snapshot parts. Existing rows and invoice/submission rules are preserved. No external service secrets are added.

MCP’s `documents` domain includes discovery/listing, full reads, creation, management, editing leases and revision-checked saves. Agent writes obey the same permissions and one-editor rule.

## Manual use cases by page

### Admin — Documents

1. As an admin, I can create a document or sheet → a private standalone file opens in a new tab, with no lesson attached.
2. As an admin, I can switch grid/table views → the same files appear and my layout preference survives a reload.
3. As an admin, I can search names/previews, filter file type/student/lesson link, sort columns and change page → the displayed results and count reflect those choices.
4. As an admin, I can rename a file → its library name changes without changing content or access.
5. As an admin, I can grant view/edit access → selected active students see it in My documents; others cannot open its URL.
6. As an admin, I can revoke or downgrade access → existing editing leases are invalidated and further saves are rejected.
7. As an admin, I can duplicate a file → a private, standalone copy contains the last saved content.
8. As an admin, I can archive/restore → the saved content is preserved; archived files disappear from students and reappear after restoration when access is retained.

### Admin — Meeting / class details

1. As an admin, I can open Documents from a meeting → that lesson’s files appear in a new tab.
2. As an admin, I can create there → the file links to that lesson and its student automatically gets edit access.
3. As an admin, I can reopen a linked file from class details or the general library → the same saved file opens; no duplicate is created.

### Tutor or student — File editor

1. As an allowed editor, I can type/format document content or enter spreadsheet data/formulas → changes save automatically, and reopening restores them.
2. As an allowed editor, I can use Save now or the editor’s save shortcut → the saved revision advances after acknowledgement.
3. As a second person/tab, I can open an actively edited file → it opens read-only; I can retry editing when the first lease is released or expires.
4. As a viewer, I can read/download → editing and server saves remain blocked.
5. As a user, I can download a copy → the editor exports DOCX or XLSX.
6. As an editor experiencing a failed/stale save, I see an explicit error → newer work is not overwritten and I can download my local work before reloading.
7. As a user, I can use Home or the library shortcut → I return to my own workspace or document list.

### Student — My documents / My notes

1. As a student, I can see only files explicitly shared with me → private or other students’ files are inaccessible even with a known URL.
2. As a student, I can open lesson documents from My notes → that lesson’s shared files appear alongside my notes/whiteboard history.
3. As an inactive student, I cannot read or edit files → saved work remains available to the tutor as history.

### New-file opening and recovery

New document and New sheet open a same-origin creation page directly, showing progress until the editor is ready. There is no blank placeholder window or redirect controlled by the original tab. If creation fails or takes too long, the new tab shows an error and Retry; the same creation identity is retained across retries/refreshes to avoid duplicate files after a lost acknowledgement. The library refreshes when a file is created or when you return to it. Pasted/external creation URLs ask for an explicit Create click instead of creating a file merely from an external navigation.

## Gridcraft spreadsheets

New editable sheets use Gridcraft 0.19.1, compiled upstream to WebAssembly and served from `/office-editor/gridcraft/`. The release ZIP is vendored in `office-editor/vendor/` and verified against its published SHA-256 during builds. The archive retains MIT/Apache-2.0 licences, attribution and notices. No Rust compiler, third-party runtime hosting, Google account or additional server is needed. Hashed JS/WASM assets have immutable cache headers. The roughly26MB WASM file makes a cold first load heavier; later visits can use the browser cache. Modern WebGPU or WebGL2 support is required; startup failures remain visible without overwriting saved work.

Saved Gridcraft workbooks use `{format:"xlsx",engine:"gridcraft",data:"<base64 XLSX>"}` inside the existing snapshot column and chunk transport. Formulas and formatting remain XLSX data, not flattened cell values. The library preview contains sheet names and a bounded selection of displayed cell values. No schema migration occurs.

Compatibility is deliberate: existing JSON snapshots are not automatically converted or overwritten. They still open in CasualOffice; new sheets open in Gridcraft. View-only access (including a second editor blocked by a lease) uses the existing read-only spreadsheet preview. It can display/download saved XLSX work but is not guaranteed to render every advanced Gridcraft feature identically. Revoked editing blocks server writes immediately; the current Gridcraft canvas remains available for recovery download until reopening.

Live collaboration remains disabled by owner agreement. The one-editor lease and revision checks continue to apply. Gridcraft's normal File tab is hidden so the TuitionHub file identity stays in control; use the surrounding Save now and Download a copy actions. Native XLSX saves use the same persistence path; PDF exports are downloaded and never stored over the workbook.

## Rename while editing

Admins can click the filename in the full-page document/sheet header, type a new name, and press Enter or the checkmark. Escape or X cancels. Names must contain1–200 characters. Errors keep the entered name available for retry. Renaming uses existing admin-only management permissions and notifications; it does not reload the editor or alter document content. The current editor's download filename updates as well. Other open library tabs refresh through the existing storage/focus mechanism.
