# Production login hotfix

Vercel runtime logs confirmed both login actions failed during migration with `SQL_PARSE_ERROR: SQL not allowed statement: PRAGMA user_version = 2`. The admin error digest was `580430507`, matching the independently reproduced live HTTP 500. This was a Turso compatibility defect missed by the local SQLite-only migration checks; it was not an invalid-password response.

Schema version reads/writes now use the `app_schema_version` key in the existing settings table. Version writes commit atomically with the migration. Fresh databases are recognized only for a missing settings table; network, permission and other SQL errors still propagate. Cold prepared databases retain a single metadata read and zero migration writes. Existing admin credentials are preserved by the migration's insert-if-missing behavior.

Verification: [31 automated tests passed](tests.txt), including a new regression that rejects PRAGMA version writes as Turso does. The [production build and TypeScript checks passed](build.txt). Legacy migration tests use a fixed pre-repair fixture rather than the changing Git HEAD. This proves the restricted-SQL path locally; live deployment/login verification is performed after push and reported separately.
