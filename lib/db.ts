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
  await c.execute("PRAGMA foreign_keys = ON");
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

  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('material','assignment','quiz','announcement')),
      title TEXT NOT NULL,
      body TEXT,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      due_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_posts_student ON posts(student_id);
    CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);

    CREATE TABLE IF NOT EXISTS post_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_post_attachments_post ON post_attachments(post_id);

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      content TEXT,
      file_url TEXT,
      grade TEXT,
      feedback TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      graded_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_post ON submissions(post_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('mcq','short_answer')),
      options TEXT,
      correct_answer TEXT,
      points INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_post ON quiz_questions(post_id);

    CREATE TABLE IF NOT EXISTS quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      answer TEXT NOT NULL,
      is_correct INTEGER,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_answers_student ON quiz_answers(student_id);

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_topics_student ON topics(student_id);

    CREATE TABLE IF NOT EXISTS class_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      scope TEXT NOT NULL CHECK(scope IN ('teacher','student')),
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(class_id, scope)
    );
    CREATE INDEX IF NOT EXISTS idx_class_notes_class ON class_notes(class_id);

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
  `);

  // Unique constraints added idempotently
  try { await c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username ON students(username)"); } catch {}
  try { await c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique ON submissions(post_id, student_id)"); } catch {}

  const alterColumns = [
    "ALTER TABLE classes ADD COLUMN recurrence_id INTEGER REFERENCES recurrences(id) ON DELETE SET NULL",
    "ALTER TABLE classes ADD COLUMN is_trial INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE classes ADD COLUMN cancel_reason TEXT",
    "ALTER TABLE classes ADD COLUMN rescheduled_from INTEGER REFERENCES classes(id) ON DELETE SET NULL",
    "ALTER TABLE classes ADD COLUMN meeting_room TEXT",
    "ALTER TABLE students ADD COLUMN username TEXT",
    "ALTER TABLE students ADD COLUMN password TEXT",
    "ALTER TABLE classes ADD COLUMN meeting_notes TEXT",
    "ALTER TABLE posts ADD COLUMN topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL",
    "ALTER TABLE posts ADD COLUMN max_points INTEGER",
    "ALTER TABLE posts ADD COLUMN updated_at TEXT",
  ];
  for (const sql of alterColumns) {
    try {
      await c.execute(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // One-time move of the old single meeting_notes column into the scoped
  // class_notes table. Existing notes were all tutor-authored, so they become
  // teacher notes; students start with an empty slate.
  const notesSplit = await c.execute(
    "SELECT value FROM settings WHERE key = 'notes_split_v1'"
  );
  if (notesSplit.rows.length === 0) {
    await c.execute(`
      INSERT OR IGNORE INTO class_notes(class_id, scope, content, updated_at)
      SELECT id, 'teacher', meeting_notes, datetime('now')
      FROM classes
      WHERE meeting_notes IS NOT NULL AND TRIM(meeting_notes) != ''
    `);
    await c.execute(
      "INSERT OR REPLACE INTO settings(key, value) VALUES ('notes_split_v1', '1')"
    );
  }

  await c.execute("INSERT OR IGNORE INTO settings(key, value) VALUES ('admin_username', 'admin')");
  await c.execute("INSERT OR IGNORE INTO settings(key, value) VALUES ('admin_password', 'admin123')");

  // Clean up expired admin sessions
  await c.execute("DELETE FROM admin_sessions WHERE expires_at < datetime('now')");
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
