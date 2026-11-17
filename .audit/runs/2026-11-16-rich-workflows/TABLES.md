# Table and mobile verification

## Changes

- Shared table explorer: search all columns or a selected column; ten-record pages with filtered counts and empty-result feedback.
- Existing native tables and shared Table component use the explorer, including admin students/invoices/finance/profile reports, parent reports/attendance, invoice items and classroom gradebook.
- Student My Notes is a table with class date, rendered content and update time. Search uses visible rich-text content, not HTML tags.
- Full admin student history also searches the complete section in SQL before its twenty-record server pagination. Report pages use a matching twenty-record client page size. Five-record overview previews remain limited; their View all links lead to full records.
- On phones, tables become labelled records that expose every column. Long values wrap. Student schedule actions stack, profile credentials wrap, profile metric cards preserve usable value width and the parent-link action has its own row.
- Printing hides search/pagination controls and reveals every table row regardless of the active query or page.

## Executed checks

Targeted Chromium walkthrough against isolated SQLite data at localhost:4633. It covers student note pagination/search/column filters/print, student schedule and notes mobile sizing, parent report search/rating filters/expansion, parent tables mobile sizing, admin student/invoice/profile mobile sizing, report expansion/filter grouping, older-history search and runtime errors. The fixture includes fifteen rich private notes plus teacher notes and more than fifteen reports.

All thirteen targeted checks passed on the final compiled build. See `tables-browser-results.json` for per-case outcomes. Screenshots are saved alongside this document. Initial harness issues (matching exact status text despite its total suffix, reading rows before hydration, and assuming a report fixture count) were corrected. The first compiled build used a rating search value of “5”; the final build uses the displayed “5/5” and the rating-column check passed.

No production business records were changed.
