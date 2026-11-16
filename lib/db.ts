import {
  createClient,
  type Client,
  type Row,
  type InValue,
  type Transaction,
} from "@libsql/client";

// Bump only when a reviewed migration is added. A prepared database needs one
// version read per process, rather than executing DDL on every cold page request.
export const SCHEMA_VERSION = 3;
let client: Client | null = null;
let initialization: Promise<void> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

export function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL must be configured");
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return client;
}

const BASE_SCHEMA = `
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

    CREATE TABLE IF NOT EXISTS reschedule_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      reason TEXT,
      preferred_time_1 TEXT NOT NULL,
      preferred_time_2 TEXT,
      preferred_time_3 TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      admin_note TEXT,
      approved_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_type TEXT NOT NULL CHECK(recipient_type IN ('admin','student')),
      recipient_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id, read);
  `;

const ADDED_COLUMNS: Record<string, Record<string, string>> = {
  classes: {
    recurrence_id: "INTEGER REFERENCES recurrences(id) ON DELETE SET NULL",
    is_trial: "INTEGER NOT NULL DEFAULT 0",
    cancel_reason: "TEXT",
    rescheduled_from: "INTEGER REFERENCES classes(id) ON DELETE SET NULL",
    meeting_room: "TEXT",
    meeting_notes: "TEXT",
  },
  students: { username: "TEXT", password: "TEXT" },
  posts: {
    topic_id: "INTEGER REFERENCES topics(id) ON DELETE SET NULL",
    max_points: "INTEGER",
    updated_at: "TEXT",
  },
  submissions: { version: "INTEGER NOT NULL DEFAULT 1" },
  notifications: { event_key: "TEXT" },
  invoices: { billing_month: "TEXT" },
  recurrences: { generated_through: "TEXT" },
};

async function migratePostOrder(tx: Transaction) {
  const columns = new Set(
    (await tx.execute("PRAGMA table_info(posts)")).rows.map((row) =>
      String(row.name),
    ),
  );
  if (!columns.has("sort_order")) {
    await tx.execute(
      "ALTER TABLE posts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
    );
    await tx.execute(`WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY student_id, topic_id ORDER BY julianday(created_at) DESC, id DESC) - 1 AS position FROM posts
    ) UPDATE posts SET sort_order=(SELECT position FROM ranked WHERE ranked.id=posts.id)`);
  }
  await tx.execute(
    "CREATE INDEX IF NOT EXISTS idx_posts_classwork_order ON posts(student_id,topic_id,sort_order,id)",
  );
}

async function writeSchemaVersion(tx: Transaction) {
  await tx.execute({
    sql: "INSERT INTO settings(key,value) VALUES ('app_schema_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    args: [String(SCHEMA_VERSION)],
  });
}

async function applyMigration(tx: Transaction, fromVersion = 0) {
  // Version 2 data/history are already migrated. Do not replay their backfills.
  if (fromVersion >= 2) {
    await migratePostOrder(tx);
    await writeSchemaVersion(tx);
    return;
  }
  await tx.executeMultiple(BASE_SCHEMA);
  // Introspect first: ignoring every ALTER error hides unavailable columns and
  // data corruption. Column definitions are fixed application constants.
  for (const [table, definitions] of Object.entries(ADDED_COLUMNS)) {
    const existing = new Set(
      (await tx.execute(`PRAGMA table_info(${table})`)).rows.map((row) =>
        String(row.name),
      ),
    );
    for (const [name, definition] of Object.entries(definitions)) {
      if (!existing.has(name))
        await tx.execute(
          `ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`,
        );
    }
  }
  await tx.executeMultiple(`
    CREATE TABLE IF NOT EXISTS student_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_sessions_expiry ON student_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS submission_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      version INTEGER NOT NULL CHECK(version > 0),
      max_points INTEGER,
      content TEXT,
      file_url TEXT,
      grade TEXT,
      feedback TEXT,
      submitted_at TEXT NOT NULL,
      graded_at TEXT,
      UNIQUE(submission_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_submission_versions_submission ON submission_versions(submission_id, version DESC);
  `);

  const versionColumns = new Set(
    (await tx.execute("PRAGMA table_info(submission_versions)")).rows.map(
      (row) => String(row.name),
    ),
  );
  if (!versionColumns.has("max_points"))
    await tx.execute(
      "ALTER TABLE submission_versions ADD COLUMN max_points INTEGER",
    );

  // Preserve every previously stored submission if an older release permitted
  // duplicates. The latest row becomes the projection; all attempts are retained.
  const duplicates = await tx.execute(
    "SELECT post_id, student_id FROM submissions GROUP BY post_id, student_id HAVING COUNT(*) > 1",
  );
  for (const duplicate of duplicates.rows) {
    const attempts = (
      await tx.execute({
        sql: "SELECT * FROM submissions WHERE post_id=? AND student_id=? ORDER BY submitted_at, id",
        args: [duplicate.post_id, duplicate.student_id],
      })
    ).rows;
    const latest = attempts[attempts.length - 1];
    for (let index = 0; index < attempts.length; index++) {
      const a = attempts[index];
      await tx.execute({
        sql: "INSERT INTO submission_versions(submission_id,version,content,file_url,grade,feedback,submitted_at,graded_at) VALUES(?,?,?,?,?,?,?,?)",
        args: [
          latest.id,
          index + 1,
          a.content,
          a.file_url,
          a.grade,
          a.feedback,
          a.submitted_at,
          a.graded_at,
        ],
      });
    }
    await tx.execute({
      sql: "DELETE FROM submissions WHERE post_id=? AND student_id=? AND id<>?",
      args: [duplicate.post_id, duplicate.student_id, latest.id],
    });
    await tx.execute({
      sql: "UPDATE submissions SET version=? WHERE id=?",
      args: [attempts.length, latest.id],
    });
  }
  await tx.execute(`INSERT OR IGNORE INTO submission_versions(submission_id,version,content,file_url,grade,feedback,submitted_at,graded_at)
    SELECT id,version,content,file_url,grade,feedback,submitted_at,graded_at FROM submissions`);

  // Existing legacy attempts have only the current rubric available. Once this
  // initial snapshot is recorded, future rubric edits never rewrite history.
  await tx.execute(`UPDATE submission_versions SET max_points=(
    SELECT p.max_points FROM submissions s JOIN posts p ON p.id=s.post_id
    WHERE s.id=submission_versions.submission_id
  ) WHERE max_points IS NULL`);

  // This index must follow username creation. A real collision is deliberately
  // surfaced for review; silently reassigning existing credentials is unsafe.
  await tx.executeMultiple(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username ON students(username);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username_casefold ON students(lower(username)) WHERE username IS NOT NULL AND trim(username) <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique ON submissions(post_id, student_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event_key ON notifications(event_key) WHERE event_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_classes_student_status_date ON classes(student_id, status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_classes_status_date ON classes(status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_classes_recurrence_date ON classes(recurrence_id, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_inbox ON notifications(recipient_type, recipient_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_billing_status ON invoices(billing_month, status);
  `);
  const notesMigrated = await tx.execute(
    "SELECT value FROM settings WHERE key='notes_split_v1'",
  );
  if (!notesMigrated.rows.length) {
    await tx.execute(`INSERT OR IGNORE INTO class_notes(class_id,scope,content,updated_at)
      SELECT id,'teacher',meeting_notes,datetime('now') FROM classes
      WHERE meeting_notes IS NOT NULL AND trim(meeting_notes)<>''`);
    await tx.execute(
      "INSERT INTO settings(key,value) VALUES ('notes_split_v1','1')",
    );
  }
  await tx.executeMultiple(`
    UPDATE invoices SET billing_month=strftime('%Y-%m',period_start,'+8 hours') WHERE billing_month IS NULL;
    UPDATE recurrences SET generated_through=(SELECT date(MAX(scheduled_at),'+8 hours') FROM classes WHERE recurrence_id=recurrences.id) WHERE generated_through IS NULL;
    INSERT OR IGNORE INTO settings(key,value) VALUES ('admin_username','admin');
    INSERT OR IGNORE INTO settings(key,value) VALUES ('admin_password','admin123');
    DELETE FROM settings WHERE key LIKE 'student_session_%';
  `);
  await migratePostOrder(tx);
  await writeSchemaVersion(tx);
}

// Turso permits schema introspection but rejects writes to PRAGMA user_version.
// Store the reviewed version in ordinary transactional application data instead.
async function readSchemaVersion(
  database: Pick<Client, "execute">,
): Promise<number> {
  try {
    const result = await database.execute(
      "SELECT value FROM settings WHERE key='app_schema_version'",
    );
    const value = result.rows[0]?.value;
    if (value === undefined) return 0;
    const version = Number(value);
    if (!Number.isSafeInteger(version) || version < 0)
      throw new Error("Invalid application database schema version");
    return version;
  } catch (error) {
    // A genuinely fresh database has no settings table. Network, authorization,
    // and every other SQL failure must propagate rather than masquerade as new.
    if (
      error instanceof Error &&
      /no such table: (?:main\.)?settings\b/i.test(error.message)
    )
      return 0;
    throw error;
  }
}

async function initialize() {
  const database = getClient();
  const current = await readSchemaVersion(database);
  if (current > SCHEMA_VERSION)
    throw new Error("Database schema is newer than this application release");
  if (current === SCHEMA_VERSION) return;
  const tx = await database.transaction("write");
  try {
    // Another deployment instance may have migrated while we waited for its lock.
    const lockedVersion = await readSchemaVersion(tx);
    if (lockedVersion < SCHEMA_VERSION) await applyMigration(tx, lockedVersion);
    else if (lockedVersion > SCHEMA_VERSION)
      throw new Error("Database schema is newer than this application release");
    await tx.commit();
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

export function ensureMigrated(): Promise<void> {
  if (!initialization) {
    initialization = initialize().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

// Explicit setup/deployment entry point; shares the same migration coordination.
export async function migrate(): Promise<void> {
  await ensureMigrated();
}

export async function withTransaction<T>(
  operation: (tx: Transaction) => Promise<T>,
): Promise<T> {
  await ensureMigrated();
  // SQLite has a single writer. Queue this process's transactions rather than
  // starting a second local BEGIN IMMEDIATE while the first is awaiting work.
  // The database write lock still protects callers from other server processes.
  const result = writeQueue.then(async () => {
    const tx = await getClient().transaction("write");
    try {
      const value = await operation(tx);
      await tx.commit();
      return value;
    } catch (error) {
      if (!tx.closed) await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  });
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function rowToObject<T>(row: Row): T {
  return row as unknown as T;
}
export async function queryAll<T>(
  sql: string,
  args: InValue[] = [],
): Promise<T[]> {
  await ensureMigrated();
  return (await getClient().execute({ sql, args })).rows.map((row) =>
    rowToObject<T>(row),
  );
}
export async function queryOne<T>(
  sql: string,
  args: InValue[] = [],
): Promise<T | undefined> {
  return (await queryAll<T>(sql, args))[0];
}
export async function execute(sql: string, args: InValue[] = []) {
  await ensureMigrated();
  return getClient().execute({ sql, args });
}
export async function getSettings(
  keys: readonly string[],
): Promise<Record<string, string>> {
  if (!keys.length) return {};
  const rows = await queryAll<{ key: string; value: string }>(
    `SELECT key,value FROM settings WHERE key IN (${keys.map(() => "?").join(",")})`,
    [...keys],
  );
  return Object.fromEntries(
    keys.map((key) => [key, rows.find((row) => row.key === key)?.value ?? ""]),
  );
}
export async function getSetting(key: string): Promise<string> {
  return (await getSettings([key]))[key];
}
