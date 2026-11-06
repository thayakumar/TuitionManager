import { createClient, type Client, type Row, type InValue } from "@libsql/client";

let _client: Client | null = null;

export function getClient(): Client {
  if (_client) return _client;
  _client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _client;
}

export async function migrate() {
  const c = getClient();
  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT,
      grade_level TEXT,
      phone TEXT,
      email TEXT,
      guardian_name TEXT,
      guardian_contact TEXT,
      hourly_rate REAL NOT NULL DEFAULT 0,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      subject TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      attendance TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_classes_student ON classes(student_id);
    CREATE INDEX IF NOT EXISTS idx_classes_scheduled_at ON classes(scheduled_at);

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL UNIQUE REFERENCES classes(id) ON DELETE CASCADE,
      topics_covered TEXT,
      homework TEXT,
      performance TEXT,
      strengths TEXT,
      areas_to_improve TEXT,
      next_focus TEXT,
      rating INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL UNIQUE,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_amount REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      subject TEXT,
      location TEXT,
      frequency TEXT NOT NULL DEFAULT 'weekly',
      custom_interval_days INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_recurrences_student ON recurrences(student_id);

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id);

    CREATE TABLE IF NOT EXISTS share_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_share_tokens_student ON share_tokens(student_id);
    CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);

    INSERT OR IGNORE INTO settings(key, value) VALUES ('business_name', 'Tuition by Ananth');
    INSERT OR IGNORE INTO settings(key, value) VALUES ('business_contact', '');
    INSERT OR IGNORE INTO settings(key, value) VALUES ('currency', 'RM');
    INSERT OR IGNORE INTO settings(key, value) VALUES ('payment_instructions', 'Bank transfer within 7 days.');
  `);

  const alterColumns = [
    "ALTER TABLE classes ADD COLUMN recurrence_id INTEGER REFERENCES recurrences(id) ON DELETE SET NULL",
    "ALTER TABLE classes ADD COLUMN is_trial INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE classes ADD COLUMN cancel_reason TEXT",
    "ALTER TABLE classes ADD COLUMN rescheduled_from INTEGER REFERENCES classes(id) ON DELETE SET NULL",
  ];
  for (const sql of alterColumns) {
    try {
      await c.execute(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

let _migrated = false;
export async function ensureMigrated() {
  if (_migrated) return;
  await migrate();
  _migrated = true;
}

function rowToObject<T>(row: Row): T {
  return row as unknown as T;
}

export async function queryAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureMigrated();
  const result = await getClient().execute({ sql, args });
  return result.rows.map((r) => rowToObject<T>(r));
}

export async function queryOne<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  await ensureMigrated();
  const result = await getClient().execute({ sql, args });
  return result.rows.length > 0 ? rowToObject<T>(result.rows[0]) : undefined;
}

export async function execute(sql: string, args: InValue[] = []) {
  await ensureMigrated();
  return getClient().execute({ sql, args });
}

export async function getSetting(key: string): Promise<string> {
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? "";
}
