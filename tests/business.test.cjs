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

test("classwork moves preserve work/history, enforce classroom boundaries and persist order", async () => {
  const f = fixture();
  try {
    await f.seed();
    await f.db.execute("INSERT INTO topics(id,student_id,name) VALUES(1,1,'Algebra'),(2,1,'Revision'),(3,2,'Private')");
    await f.db.execute("INSERT INTO posts(id,type,title,student_id,topic_id,sort_order,max_points) VALUES(1,'assignment','First',1,1,0,100),(2,'material','Second',1,1,1,NULL),(3,'material','Third',1,2,0,NULL),(4,'material','Foreign',2,3,0,NULL)");
    await f.db.execute("INSERT INTO submissions(id,post_id,student_id,content,grade,feedback,version) VALUES(1,1,1,'Work','85','Feedback',1)");
    await f.db.execute("INSERT INTO submission_versions(submission_id,version,content,grade,feedback,submitted_at) VALUES(1,1,'Work','85','Feedback','2026-01-01 00:00:00')");
    await f.db.execute("INSERT INTO post_attachments(post_id,file_name,file_url) VALUES(1,'work.pdf','https://example.com/work.pdf')");
    assert.deepEqual(await f.actions.moveClassworkPost(2,1,1,1),{success:true});
    assert.deepEqual((await f.db.queryAll('SELECT id FROM posts WHERE topic_id=1 ORDER BY sort_order,id DESC')).map(r=>r.id),[2,1]);
    assert.deepEqual(await f.actions.moveClassworkPost(1,1,2,3),{success:true});
    assert.deepEqual((await f.db.queryAll('SELECT id FROM posts WHERE topic_id=2 ORDER BY sort_order,id DESC')).map(r=>r.id),[1,3]);
    assert.equal((await f.db.queryOne('SELECT grade FROM submissions WHERE id=1')).grade,'85');
    assert.equal((await f.db.queryOne('SELECT content FROM submission_versions WHERE submission_id=1')).content,'Work');
    assert.equal((await f.db.queryOne('SELECT file_name FROM post_attachments WHERE post_id=1')).file_name,'work.pdf');
    assert.equal((await f.actions.moveClassworkPost(1,1,3,null)).success,false);
    assert.equal((await f.actions.moveClassworkPost(1,1,2,4)).success,false);
    assert.equal((await f.actions.moveClassworkPost(4,1,null,null)).success,false);
    await f.actions.moveClassworkPost(1,1,null,null);
    assert.equal((await f.db.queryOne('SELECT topic_id FROM posts WHERE id=1')).topic_id,null);
    const noticeCount=(await f.db.queryOne('SELECT COUNT(*) AS n FROM notifications')).n;
    await f.actions.moveClassworkPost(1,1,null,null);
    assert.equal((await f.db.queryOne('SELECT COUNT(*) AS n FROM notifications')).n,noticeCount);
    f.as('student',1);
    await assert.rejects(()=>f.actions.moveClassworkPost(1,1,1,null),/Unauthorized/);
  } finally { f.close(); }
});

test("saving a lesson report records unmarked attendance as Present without overriding absence/cancellation", async () => {
 const f=fixture();try{await f.seed();const unmarked=await insertLesson(f,{status:'scheduled',attendance:null});const absent=await insertLesson(f,{at:'2026-10-11T02:00:00Z',attendance:'absent'});const canceled=await insertLesson(f,{at:'2026-10-12T02:00:00Z',status:'canceled',attendance:null});
 for(const cid of [unmarked,absent,canceled])await f.actions.saveReportQuick(cid,form({topics_covered:'Lesson recap',rating:4}));
 assert.equal((await f.db.queryOne('SELECT attendance FROM classes WHERE id=?',[unmarked])).attendance,'present');assert.equal((await f.db.queryOne('SELECT status FROM classes WHERE id=?',[unmarked])).status,'completed');assert.equal((await f.db.queryOne('SELECT attendance FROM classes WHERE id=?',[absent])).attendance,'absent');assert.equal((await f.db.queryOne('SELECT status FROM classes WHERE id=?',[canceled])).status,'canceled');assert.equal((await f.db.queryOne('SELECT attendance FROM classes WHERE id=?',[canceled])).attendance,null);
 const invoice=await f.actions.generateInvoiceQuick(form({student_id:1,period_start:'2026-10-01',period_end:'2026-10-31'}));assert.equal((await f.db.queryOne('SELECT total_amount FROM invoices WHERE id=?',[invoice])).total_amount,80);assert.deepEqual((await f.db.queryAll('SELECT class_id FROM invoice_items WHERE invoice_id=?',[invoice])).map(r=>r.class_id),[unmarked]);
 }finally{f.close()}
});

test("parent reschedule credentials scope requests, revoke immediately and allow tutor's own time", async () => {
  const f = fixture();
  try {
    await f.seed();
    await f.db.execute("INSERT INTO share_tokens(student_id,token) VALUES(1,'parent-alice'),(2,'parent-bob')");
    const cid = await insertLesson(f,{at:"2027-02-10T02:00:00Z",status:"scheduled",attendance:null,trial:1});
    const data = form({class_id:cid,student_id:2,preferred_time_1:"2027-02-11T10:00",reason:"Family appointment"});
    f.as("anonymous");
    assert.match((await f.actions.createParentRescheduleRequest("missing",data)).error,/link/);
    assert.match((await f.actions.createParentRescheduleRequest("parent-bob",data)).error,/belong/);
    assert.equal((await f.actions.createParentRescheduleRequest("parent-alice",data)).success,true);
    assert.match((await f.actions.createParentRescheduleRequest("parent-alice",data)).error,/pending/);
    assert.equal((await f.db.queryOne("SELECT status FROM classes WHERE id=?",[cid])).status,"scheduled");
    const req=await f.db.queryOne("SELECT id,student_id FROM reschedule_requests WHERE class_id=?",[cid]);
    assert.equal(req.student_id,1);
    assert.match((await f.db.queryOne("SELECT message FROM notifications WHERE type='reschedule_request'")).message,/parent/);
    f.as("admin");
    assert.equal((await f.actions.approveRescheduleRequest(req.id,"2027-02-12T15:30","Tutor-selected slot")).success,true);
    const replacement=await f.db.queryOne("SELECT student_id,is_trial,scheduled_at FROM classes WHERE rescheduled_from=?",[cid]);
    assert.equal(replacement.student_id,1);assert.equal(replacement.is_trial,1);assert.equal(replacement.scheduled_at,"2027-02-12T07:30:00.000Z");
    assert.equal((await f.db.queryOne("SELECT status FROM classes WHERE id=?",[cid])).status,"canceled");
    const next=await insertLesson(f,{at:"2027-02-20T02:00:00Z",status:"scheduled",attendance:null});
    await f.db.execute("UPDATE share_tokens SET active=0 WHERE token='parent-alice'");
    f.as("anonymous");
    assert.match((await f.actions.createParentRescheduleRequest("parent-alice",form({class_id:next,preferred_time_1:"2027-02-21T10:00"}))).error,/link/);
    assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM reschedule_requests WHERE class_id=?",[next])).n,0);
  } finally {f.close();}
});

test("draft invoice generation stays private until a visible status is applied",async()=>{
 const f=fixture();
 try{
  await f.seed();await insertLesson(f);
  const inv=await f.actions.generateInvoiceQuick(form({student_id:1,period_start:"2026-10-01",period_end:"2026-10-31"}));
  assert.equal((await f.db.queryOne("SELECT status FROM invoices WHERE id=?",[inv])).status,"draft");
  assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE type IN ('invoice_created','invoice_updated')")).n,0);
  await f.actions.setInvoiceStatus(inv,"sent");
  assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE type='invoice_updated'")).n,1);
  await f.actions.setInvoiceStatus(inv,"draft");
  assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE type='invoice_updated'")).n,1);
 }finally{f.close();}
});

test("post files save atomically with all post kinds and attachment-only edits notify without losing content", async () => {
  const f=fixture();
  try {
    await f.seed();
    for(const kind of ["material","assignment","announcement"]) {
      const result=await f.actions.createPostAction(1,kind,"File "+kind,"Read this",null,null,null,[{fileName:"worksheet.docx",fileUrl:"https://drive.google.com/file/d/examplefileid/view",fileType:"application/msword"}]);
      assert.equal(result.success,true);
    }
    assert.equal((await f.db.queryOne("SELECT COUNT(*) AS n FROM post_attachments")).n,3);
    const p=await f.db.queryOne("SELECT * FROM posts WHERE type='material'");
    await f.actions.updatePost(form({id:p.id,title:p.title,body:p.body,attachments:JSON.stringify([{fileName:"second.pdf",fileUrl:"https://example.com/second.pdf",fileType:"application/pdf"}])}));
    assert.equal((await f.db.queryOne("SELECT COUNT(*) AS n FROM post_attachments WHERE post_id=?",[p.id])).n,2);
    const bad=await f.actions.createPostAction(1,"material","Do not create","Body",null,null,null,[{fileName:"bad",fileUrl:"javascript:bad()",fileType:""}]);
    assert.equal(bad.success,false);
    assert.equal((await f.db.queryOne("SELECT COUNT(*) AS n FROM posts WHERE title='Do not create'")).n,0);
  } finally {f.close();}
});

test("rich assignment work rejects visually empty HTML and preserves safe formatting across versions", async () => {
  const f=fixture();
  try {
    await f.seed();
    await f.db.execute("INSERT INTO posts(id,type,title,student_id,max_points) VALUES(1,'assignment','Rich work',1,100)");
    f.as('student',1);
    for(const content of ['<p><br></p>','<p>&nbsp;</p>','<script>alert(1)</script>']) {
      await assert.rejects(()=>f.actions.submitAssignment(form({post_id:1,student_id:1,content})),/Add your work/);
    }
    await f.actions.submitAssignment(form({post_id:1,student_id:1,content:'<p><strong>Answer</strong> <a href="https://example.com" onclick="alert(1)">source</a></p><script>alert(1)</script>'}));
    const attempt=await f.db.queryOne('SELECT content FROM submissions WHERE post_id=1');
    assert.match(attempt.content,/<strong>Answer<\/strong>/);
    assert.match(attempt.content,/href="https:\/\/example.com"/);
    assert.doesNotMatch(attempt.content,/onclick|<script|alert\(1\)/);
    await f.actions.submitAssignment(form({post_id:1,student_id:1,content:'<ul><li><p><u>Improved</u></p></li></ul>'}));
    const versions=await f.db.queryAll('SELECT content FROM submission_versions ORDER BY version');
    assert.equal(versions.length,2);
    assert.equal(versions[0].content,attempt.content);
    assert.match(versions[1].content,/<ul><li><p><u>Improved/);
  } finally { f.close(); }
});

test("clearing rich meeting notes stores an empty note rather than an invisible HTML row", async () => {
  const f=fixture();
  try {
    await f.seed();
    const classId=await insertLesson(f);
    await f.actions.saveClassNotes(classId,'teacher','<p><strong>Notes</strong></p>');
    assert.match((await f.db.queryOne('SELECT content FROM class_notes WHERE class_id=?',[classId])).content,/<strong>Notes/);
    await f.actions.saveClassNotes(classId,'teacher','<p><br></p>');
    assert.equal((await f.db.queryOne('SELECT content FROM class_notes WHERE class_id=?',[classId])).content,'');
  } finally { f.close(); }
});

test("image-only submitted work persists a safe inline reference and remains in attempt history", async () => {
  const f=fixture();
  try {
    await f.seed();
    await f.db.execute("INSERT INTO posts(id,type,title,student_id,max_points) VALUES(1,'assignment','Sketch work',1,100)");
    f.as('student',1);
    await f.actions.submitAssignment(form({post_id:1,student_id:1,content:'<p><img src="/api/files/example_file_123?inline=1" alt="My diagram"></p>'}));
    const work=await f.db.queryOne('SELECT content FROM submissions WHERE post_id=1');
    assert.match(work.content,/src="\/api\/files\/example_file_123\?inline=1"/);
    assert.equal((await f.db.queryAll('SELECT content FROM submission_versions')).length,1);
    await assert.rejects(()=>f.actions.submitAssignment(form({post_id:1,student_id:1,content:'<img src="data:image/png;base64,not-real">'})),/Add your work/);
  } finally {f.close();}
});

test("class comments keep author ownership, notify the other role and preserve classroom isolation",async()=>{
  const f=fixture();
  try{
    await f.seed();await f.actions.createPostAction(1,"announcement","Discussion","Class update",null);
    const p=await f.db.queryOne("SELECT id FROM posts WHERE student_id=1");
    await f.actions.savePostComment(p.id,"<p>Tutor <b>comment</b></p>");
    const first=await f.db.queryOne("SELECT * FROM post_comments WHERE post_id=?",[p.id]);
    assert.equal(first.author_role,"admin");
    assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE recipient_type='student' AND type='post_comment'")).n,1);
    f.as("student",1);
    await f.actions.savePostComment(p.id,"<p>Student answer</p>");
    const second=await f.db.queryOne("SELECT * FROM post_comments WHERE author_role='student'");
    await assert.rejects(()=>f.actions.savePostComment(p.id,"Changed tutor text",first.id),/own comments/);
    await f.actions.savePostComment(p.id,"Updated answer",second.id);
    assert.equal((await f.db.queryOne("SELECT body FROM post_comments WHERE id=?",[second.id])).body,"Updated answer");
    await assert.rejects(()=>f.actions.deletePostComment(p.id,first.id),/own comments/);
    await assert.rejects(()=>f.actions.savePostComment(p.id,"<p>&nbsp;</p>"),/comment/);
    f.as("student",2);
    await assert.rejects(()=>f.actions.savePostComment(p.id,"Foreign"),/not assigned/);
    await assert.rejects(()=>f.actions.deletePostComment(p.id,second.id),/not assigned/);
    f.as("admin");
    await f.actions.deletePostComment(p.id,second.id);
    assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM post_comments WHERE id=?",[second.id])).n,0);
    assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE recipient_type='admin' AND type='post_comment'")).n,1);
  }finally{f.close()}
});

test("attachment removal and replacement are atomic and reject another post's files",async()=>{
  const f=fixture();
  try{
    await f.seed();
    for(const name of ["One","Two"])await f.actions.createPostAction(1,"material",name,"Body",null,null,null,[{fileName:name+".pdf",fileUrl:"https://example.com/"+name+".pdf",fileType:"application/pdf"}]);
    const posts=await f.db.queryAll("SELECT * FROM posts ORDER BY id"),files=await f.db.queryAll("SELECT * FROM post_attachments ORDER BY id");
    await assert.rejects(()=>f.actions.updatePost(form({id:posts[0].id,title:"Do not update",body:"Body",removed_attachment_ids:JSON.stringify([files[1].id])})),/does not belong/);
    assert.equal((await f.db.queryOne("SELECT title FROM posts WHERE id=?",[posts[0].id])).title,"One");
    await f.actions.updatePost(form({id:posts[0].id,title:"One",body:"Body",removed_attachment_ids:JSON.stringify([files[0].id]),attachments:JSON.stringify([{fileName:"replacement.pdf",fileUrl:"https://example.com/replacement.pdf",fileType:"application/pdf"}])}));
    const replacement=await f.db.queryAll("SELECT * FROM post_attachments WHERE post_id=?",[posts[0].id]);
    assert.equal(replacement.length,1);assert.equal(replacement[0].file_name,"replacement.pdf");
    assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM post_attachments WHERE id=?",[files[1].id])).n,1);
  }finally{f.close()}
});

test("legacy quiz assignment file-only submissions preserve current grading and lineage",async()=>{
 const f=fixture();try{await f.seed();await f.actions.createPostAction(1,"quiz","Legacy work","Instructions",null,null,100);const p=await f.db.queryOne("SELECT id FROM posts WHERE type='quiz'");f.as("student",1);await f.actions.submitAssignment(form({post_id:p.id,student_id:1,content:"",file_url:"https://drive.google.com/file/d/quiz_attachment_file/view"}));const first=await f.db.queryOne("SELECT * FROM submissions WHERE post_id=?",[p.id]);assert(first.file_url.includes("quiz_attachment_file"));f.as("admin");await f.actions.gradeSubmissionAction(first.id,"75","Good",1,1);f.as("student",1);await f.actions.submitAssignment(form({post_id:p.id,student_id:1,content:"Corrected answer",file_url:first.file_url}));const latest=await f.db.queryOne("SELECT * FROM submissions WHERE post_id=?",[p.id]);assert.equal(latest.version,2);assert.equal(latest.grade,null);assert.equal((await f.db.queryOne("SELECT grade FROM submission_versions WHERE submission_id=? AND version=1",[first.id])).grade,"75")}finally{f.close()}
});

test("expired student session returns a deliberate retry result and the same attachment can be submitted after sign-in",async()=>{
 const f=fixture();try{await f.seed();await f.actions.createPostAction(1,"assignment","Retry work","",null);const p=await f.db.queryOne("SELECT id FROM posts");const answer=form({post_id:p.id,student_id:1,content:"Kept answer",file_url:"https://drive.google.com/file/d/retained_upload_file/view"});f.as("anonymous");const failure=await f.actions.submitAssignmentResult(answer);assert.equal(failure.success,false);assert.equal(failure.code,"SESSION_EXPIRED");assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM submissions")).n,0);f.as("student",1);assert.equal((await f.actions.submitAssignmentResult(answer)).success,true);assert.equal((await f.actions.submitAssignmentResult(answer)).success,true);assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM submission_versions")).n,1);assert.equal((await f.db.queryOne("SELECT file_url FROM submissions")).file_url,"https://drive.google.com/file/d/retained_upload_file/view")}finally{f.close()}
});
