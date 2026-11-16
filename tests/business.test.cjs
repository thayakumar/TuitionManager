const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

// Actual application modules and real local SQLite. Only Next side effects and
// caller identities are stubbed; HTTP/session integration is covered separately.
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-business-"));
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;
  let role = "admin",
    studentId = null;
  const cache = new Map();
  const auth = {
    verifyAdminSession: async () => role === "admin",
    getStudentSession: async () => (role === "student" ? studentId : null),
    createAdminSession: async () => {},
    destroyAdminSession: async () => {},
    createStudentSession: async () => {},
    destroyStudentSession: async () => {},
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const m = new Module(filename, module);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(root);
    cache.set(filename, m);
    const original = m.require.bind(m);
    m.require = (name) => {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "next/navigation")
        return {
          redirect(url) {
            throw new Error(`REDIRECT:${url}`);
          },
        };
      if (filename === path.join(root, "lib/actions.ts") && name === "./auth")
        return auth;
      if (name.startsWith(".")) {
        const resolved = path.resolve(path.dirname(filename), name) + ".ts";
        if (fs.existsSync(resolved)) return load(resolved);
      }
      return original(name);
    };
    m._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
    return m.exports;
  }
  const db = load("lib/db.ts"),
    actions = load("lib/actions.ts");
  return {
    db,
    actions,
    as(nextRole, sid = null) {
      role = nextRole;
      studentId = sid;
    },
    async seed() {
      await db.ensureMigrated();
      await db.execute(
        "INSERT INTO students(id,name,username,password,hourly_rate) VALUES (1,'Alice','alice','testpass',80),(2,'Bob','bob','testpass',80)",
      );
    },
    close() {
      db.getClient().close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
function form(values) {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value))
      value.forEach((item) => f.append(key, String(item)));
    else f.set(key, String(value));
  }
  return f;
}
async function insertLesson(f, options = {}) {
  const {
    sid = 1,
    at = "2026-10-10T02:00:00Z",
    status = "completed",
    attendance = "present",
    trial = 0,
    recurrence = null,
  } = options;
  const r = await f.db.execute(
    "INSERT INTO classes(student_id,scheduled_at,duration_minutes,status,attendance,is_trial,recurrence_id,meeting_room,subject) VALUES(?,?,60,?,?,?,?,?,?)",
    [
      sid,
      at,
      status,
      attendance,
      trial,
      recurrence,
      "TestRoom",
      "SUBJECT_MUST_NOT_APPEAR",
    ],
  );
  return Number(r.lastInsertRowid);
}

test("MYT scheduling round-trips, global overlap rejects, and failed composite change rolls back", async () => {
  const f = fixture();
  try {
    await f.seed();
    const id = await f.actions.createClassQuick(
      form({
        student_id: 1,
        scheduled_at: "2027-01-10T10:00",
        duration_minutes: 60,
      }),
    );
    assert.equal(
      (await f.db.queryOne("SELECT scheduled_at FROM classes WHERE id=?", [id]))
        .scheduled_at,
      "2027-01-10T02:00:00.000Z",
    );
    await assert.rejects(
      () =>
        f.actions.createClassQuick(
          form({
            student_id: 2,
            scheduled_at: "2027-01-10T10:30",
            duration_minutes: 60,
          }),
        ),
      /overlaps/,
    );
    assert.equal(
      (await f.db.queryOne("SELECT COUNT(*) AS count FROM classes")).count,
      1,
    );
    await assert.rejects(
      () => f.actions.cancelClass(id, form({ reschedule_date: "bad-date" })),
      /valid/,
    );
    assert.equal(
      (await f.db.queryOne("SELECT status FROM classes WHERE id=?", [id]))
        .status,
      "scheduled",
    );
    await assert.rejects(
      () =>
        f.actions.createClassQuick(
          form({
            student_id: 1,
            scheduled_at: "2027-02-31T10:00",
            duration_minutes: 60,
          }),
        ),
      /valid/,
    );
  } finally {
    f.close();
  }
});

test("invoices omit absence/cancellation, preserve trial price, use billing month and subject-free descriptions", async () => {
  const f = fixture();
  try {
    await f.seed();
    const present = await insertLesson(f);
    await insertLesson(f, { at: "2026-10-11T02:00:00Z", attendance: "absent" });
    await insertLesson(f, {
      at: "2026-10-12T02:00:00Z",
      status: "canceled",
      attendance: null,
    });
    const trial = await insertLesson(f, {
      at: "2026-10-13T02:00:00Z",
      trial: 1,
    });
    const legacy = await insertLesson(f, {
      at: "2026-10-14T02:00:00Z",
      attendance: "late",
    });
    const invoiceId = await f.actions.generateInvoiceQuick(
      form({
        student_id: 1,
        period_start: "2026-10-01",
        period_end: "2026-10-31",
      }),
    );
    const invoice = await f.db.queryOne("SELECT * FROM invoices WHERE id=?", [
      invoiceId,
    ]);
    assert.equal(invoice.total_amount, 160);
    assert.equal(invoice.billing_month, "2026-10");
    assert.equal(invoice.period_start, "2026-09-30T16:00:00.000Z");
    assert.equal(invoice.period_end, "2026-10-31T15:59:59.999Z");
    const items = await f.db.queryAll(
      "SELECT * FROM invoice_items ORDER BY class_id",
    );
    assert.deepEqual(
      items.map((i) => i.class_id),
      [present, trial, legacy],
    );
    assert.equal(items.find((i) => i.class_id === trial).amount, 0);
    assert.ok(
      items.every((i) => !i.description.includes("SUBJECT_MUST_NOT_APPEAR")),
    );
    assert.ok(items.every((i) => i.description.includes("60 min")));
    await assert.rejects(
      () =>
        f.actions.generateInvoiceQuick(
          form({
            student_id: 1,
            period_start: "2026-10-01",
            period_end: "2026-10-31",
          }),
        ),
      /No present/,
    );
  } finally {
    f.close();
  }
});

test("concurrent invoice generations cannot claim one lesson twice", async () => {
  const f = fixture();
  try {
    await f.seed();
    const classId = await insertLesson(f);
    const input = form({
      student_id: 1,
      period_start: "2026-10-01",
      period_end: "2026-10-31",
    });
    const results = await Promise.allSettled([
      f.actions.generateInvoiceQuick(input),
      f.actions.generateInvoiceQuick(input),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (
        await f.db.queryOne(
          "SELECT COUNT(*) AS count FROM invoice_items WHERE class_id=?",
          [classId],
        )
      ).count,
      1,
    );
    assert.equal(
      (await f.db.queryOne("SELECT SUM(total_amount) AS total FROM invoices"))
        .total,
      80,
    );
  } finally {
    f.close();
  }
});

test("reschedule owns pending requests, preserves trial, prevents duplicate resolution and notifies correct student", async () => {
  const f = fixture();
  try {
    await f.seed();
    const classId = await insertLesson(f, {
      at: "2027-01-10T02:00:00Z",
      status: "scheduled",
      attendance: null,
      trial: 1,
    });
    const data = form({
      class_id: classId,
      student_id: 1,
      preferred_time_1: "2027-01-11T10:00",
    });
    f.as("anonymous");
    await assert.rejects(
      () => f.actions.createRescheduleRequest(data),
      /Unauthorized/,
    );
    f.as("student", 2);
    assert.match(
      (
        await f.actions.createRescheduleRequest(
          form({
            class_id: classId,
            student_id: 2,
            preferred_time_1: "2027-01-11T10:00",
          }),
        )
      ).error,
      /belong/,
    );
    f.as("student", 1);
    assert.equal((await f.actions.createRescheduleRequest(data)).success, true);
    assert.match(
      (await f.actions.createRescheduleRequest(data)).error,
      /pending/,
    );
    assert.equal(
      (await f.db.queryOne("SELECT status FROM classes WHERE id=?", [classId]))
        .status,
      "scheduled",
    );
    const request = await f.db.queryOne("SELECT id FROM reschedule_requests");
    f.as("admin");
    assert.equal(
      (
        await f.actions.approveRescheduleRequest(
          request.id,
          "2027-01-11T10:00",
          "Confirmed",
        )
      ).success,
      true,
    );
    assert.match(
      (
        await f.actions.approveRescheduleRequest(
          request.id,
          "2027-01-11T10:00",
          null,
        )
      ).error,
      /resolved/,
    );
    assert.match(
      (await f.actions.rejectRescheduleRequest(request.id, null)).error,
      /resolved/,
    );
    const replacements = await f.db.queryAll(
      "SELECT * FROM classes WHERE rescheduled_from=?",
      [classId],
    );
    assert.equal(replacements.length, 1);
    assert.equal(replacements[0].is_trial, 1);
    assert.equal(replacements[0].student_id, 1);
    assert.equal(replacements[0].scheduled_at, "2027-01-11T02:00:00.000Z");
    assert.equal(
      (
        await f.db.queryOne(
          "SELECT COUNT(*) AS count FROM notifications WHERE type='reschedule_approved' AND recipient_id=1",
        )
      ).count,
      1,
    );
  } finally {
    f.close();
  }
});

test("a conflicting reschedule does not cancel the original or resolve its request", async () => {
  const f = fixture();
  try {
    await f.seed();
    const original = await insertLesson(f, {
      at: "2027-01-10T02:00:00Z",
      status: "scheduled",
      attendance: null,
    });
    await insertLesson(f, {
      sid: 2,
      at: "2027-01-11T02:00:00Z",
      status: "scheduled",
      attendance: null,
    });
    f.as("student", 1);
    assert.equal(
      (
        await f.actions.createRescheduleRequest(
          form({
            student_id: 1,
            class_id: original,
            preferred_time_1: "2027-01-11T10:00",
          }),
        )
      ).success,
      true,
    );
    f.as("admin");
    const request = await f.db.queryOne("SELECT id FROM reschedule_requests");
    assert.match(
      (
        await f.actions.approveRescheduleRequest(
          request.id,
          "2027-01-11T10:00",
          null,
        )
      ).error,
      /overlaps/,
    );
    assert.equal(
      (await f.db.queryOne("SELECT status FROM classes WHERE id=?", [original]))
        .status,
      "scheduled",
    );
    assert.equal(
      (await f.db.queryOne("SELECT status FROM reschedule_requests")).status,
      "pending",
    );
    assert.equal(
      (
        await f.db.queryOne(
          "SELECT COUNT(*) AS count FROM classes WHERE rescheduled_from=?",
          [original],
        )
      ).count,
      0,
    );
  } finally {
    f.close();
  }
});

test("assignment lineage keeps work and grades; only newest attempt can be graded", async () => {
  const f = fixture();
  try {
    await f.seed();
    await f.db.execute(
      "INSERT INTO posts(id,type,title,student_id,max_points) VALUES(1,'assignment','Alice work',1,100),(2,'assignment','Bob work',2,100)",
    );
    f.as("student", 1);
    await assert.rejects(
      () =>
        f.actions.submitAssignment(
          form({ post_id: 1, student_id: 1, content: "   " }),
        ),
      /Add your work/,
    );
    await assert.rejects(
      () =>
        f.actions.submitAssignment(
          form({ post_id: 2, student_id: 1, content: "Foreign" }),
        ),
      /not assigned/,
    );
    await assert.rejects(
      () =>
        f.actions.submitAssignment(
          form({ post_id: 1, student_id: 1, file_url: "javascript:alert(1)" }),
        ),
      /HTTPS/,
    );
    await f.actions.submitAssignment(
      form({ post_id: 1, student_id: 1, content: "Version one" }),
    );
    let latest = await f.db.queryOne("SELECT * FROM submissions");
    f.as("admin");
    await assert.rejects(
      () => f.actions.gradeSubmissionAction(latest.id, "101", "", 1, 1),
      /0–100/,
    );
    await f.actions.gradeSubmissionAction(
      latest.id,
      "90",
      "Original feedback",
      1,
      1,
    );
    f.as("student", 1);
    await f.actions.submitAssignment(
      form({ post_id: 1, student_id: 1, content: "Version two" }),
    );
    latest = await f.db.queryOne("SELECT * FROM submissions");
    assert.equal(latest.version, 2);
    assert.equal(latest.grade, null);
    assert.equal(latest.graded_at, null);
    f.as("admin");
    await assert.rejects(
      () =>
        f.actions.gradeSubmissionAction(latest.id, "99", "Stale screen", 1, 1),
      /Newer work/,
    );
    await f.actions.gradeSubmissionAction(
      latest.id,
      "95",
      "New feedback",
      1,
      2,
    );
    f.as("student", 1);
    await f.actions.submitAssignment(
      form({ post_id: 1, student_id: 1, content: "Version three" }),
    );
    f.as("admin");
    await f.actions.gradeSubmissionAction(
      latest.id,
      "100",
      "Final feedback",
      1,
      3,
    );
    const history = await f.db.queryAll(
      "SELECT version,content,grade,feedback FROM submission_versions ORDER BY version",
    );
    assert.deepEqual(
      history.map((h) => [h.version, h.content, h.grade]),
      [
        [1, "Version one", "90"],
        [2, "Version two", "95"],
        [3, "Version three", "100"],
      ],
    );
    latest = await f.db.queryOne("SELECT * FROM submissions");
    assert.equal(latest.version, 3);
    assert.equal(latest.grade, "100");
  } finally {
    f.close();
  }
});

test("post edits notify its student once, no-op save is silent, inbox count is uncapped and scoped", async () => {
  const f = fixture();
  try {
    await f.seed();
    await f.actions.createPostAction(
      1,
      "material",
      "Original title",
      "Original body",
      null,
    );
    const post = await f.db.queryOne("SELECT id FROM posts");
    const update = form({
      id: post.id,
      title: "Edited title",
      body: "Updated content",
    });
    await f.actions.updatePost(update);
    await f.actions.updatePost(update);
    assert.equal(
      (
        await f.db.queryOne(
          "SELECT COUNT(*) AS count FROM notifications WHERE type='post_updated'",
        )
      ).count,
      1,
    );
    await f.db.withTransaction(async (tx) => {
      for (let n = 0; n < 60; n++)
        await tx.execute({
          sql: "INSERT INTO notifications(recipient_type,recipient_id,type,title,message) VALUES('student',1,'test','Test','Test')",
          args: [],
        });
    });
    const target = await f.db.execute(
      "INSERT INTO notifications(recipient_type,recipient_id,type,title,message) VALUES('student',2,'test','Private Bob','Private Bob')",
    );
    f.as("student", 1);
    const summary = await f.actions.getNotificationSummary("student", 1);
    assert.equal(summary.notifications.length, 50);
    assert.equal(summary.unreadCount, 62);
    await assert.rejects(
      () => f.actions.getNotifications("student", 2),
      /Unauthorized/,
    );
    await assert.rejects(
      () => f.actions.markNotificationRead(Number(target.lastInsertRowid)),
      /Unauthorized/,
    );
    await f.actions.markAllNotificationsRead("student", 1);
    assert.equal(
      (await f.actions.getNotificationSummary("student", 1)).unreadCount,
      0,
    );
    assert.equal(
      (
        await f.db.queryOne("SELECT read FROM notifications WHERE id=?", [
          Number(target.lastInsertRowid),
        ])
      ).read,
      0,
    );
    f.as("anonymous");
    await assert.rejects(
      () => f.actions.getNotifications("admin", null),
      /Unauthorized/,
    );
  } finally {
    f.close();
  }
});

test("recurrences materialize through year end with usable rooms, no holiday skip and safe history-preserving stop", async () => {
  const f = fixture();
  try {
    await f.seed();
    await f.db.execute(
      "INSERT INTO holidays(name,date) VALUES('Legacy holiday','2027-12-24')",
    );
    await f.actions.createRecurrenceQuick(
      form({
        student_id: 1,
        day_of_week: [5],
        time: "10:00",
        start_date: "2027-12-17",
        duration_minutes: 60,
        frequency: "weekly",
      }),
    );
    const classes = await f.db.queryAll(
      "SELECT * FROM classes ORDER BY scheduled_at",
    );
    assert.deepEqual(
      classes.map((c) => c.scheduled_at.slice(0, 10)),
      ["2027-12-17", "2027-12-24", "2027-12-31"],
    );
    assert.ok(classes.every((c) => c.meeting_room && c.attendance === null));
    const recurrence = await f.db.queryOne("SELECT * FROM recurrences");
    assert.equal(recurrence.generated_through, "2027-12-31");
    const past = await insertLesson(f, {
      at: "2020-01-01T02:00:00Z",
      status: "scheduled",
      attendance: null,
      recurrence: recurrence.id,
    });
    await f.actions.stopRecurrence(recurrence.id);
    assert.equal(
      (await f.db.queryOne("SELECT status FROM classes WHERE id=?", [past]))
        .status,
      "scheduled",
    );
    assert.equal(
      (
        await f.db.queryAll("SELECT * FROM classes WHERE recurrence_id=?", [
          recurrence.id,
        ])
      ).length,
      4,
    );
    assert.equal(
      (
        await f.db.queryOne(
          "SELECT COUNT(*) AS count FROM classes WHERE recurrence_id=? AND status='canceled'",
          [recurrence.id],
        )
      ).count,
      3,
    );
    const noticeCount = (
      await f.db.queryOne(
        "SELECT COUNT(*) AS count FROM notifications WHERE type='schedule_updated'",
      )
    ).count;
    await f.actions.stopRecurrence(recurrence.id);
    assert.equal(
      (
        await f.db.queryOne(
          "SELECT COUNT(*) AS count FROM notifications WHERE type='schedule_updated'",
        )
      ).count,
      noticeCount,
    );
  } finally {
    f.close();
  }
});
