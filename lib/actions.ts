"use server";
import { ActionValidationError } from "./action-errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import type { Transaction, InValue } from "@libsql/client";
import { queryAll, queryOne, execute, withTransaction } from "./db";
import {
  createAdminSession,
  destroyAdminSession,
  createStudentSession,
  destroyStudentSession,
  verifyAdminSession,
  getStudentSession,
} from "./auth";
import type { Attendance, InvoiceStatus } from "./types";
import { id, numberIn, text, oneOf, safeUrl } from "./domain/validation";
import {
  businessDateTime,
  businessDate,
  nextDate,
  billingMonth,
  monthBounds,
} from "./domain/business-time";
async function requireAdmin() {
  if (!(await verifyAdminSession()))
    throw new ActionValidationError("Unauthorized");
}
async function studentSession(expected?: number) {
  const sid = await getStudentSession();
  if (!sid || (expected !== undefined && sid !== expected))
    throw new ActionValidationError("Unauthorized");
  return sid;
}
async function row<T>(tx: Transaction, sql: string, args: InValue[] = []) {
  return (await tx.execute({ sql, args })).rows[0] as unknown as T | undefined;
}
async function activeStudent(tx: Transaction, studentId: number) {
  if (
    !(await row(tx, "SELECT id FROM students WHERE id=? AND active=1", [
      id(studentId),
    ]))
  )
    throw new ActionValidationError("Student is inactive or unavailable");
}
function refresh(studentId?: number) {
  for (const p of [
    "/",
    "/students",
    "/schedule",
    "/invoices",
    "/financial-history",
    "/requests",
    "/notifications",
    "/classroom",
  ])
    revalidatePath(p);
  if (studentId) {
    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/classroom/${studentId}`, "layout");
    revalidatePath(`/portal/student/${studentId}`, "layout");
  }
  revalidatePath("/share", "layout");
}
async function notify(
  tx: Transaction,
  studentId: number | null,
  type: string,
  title: string,
  message: string,
  key: string,
  link?: string,
) {
  await tx.execute({
    sql: `INSERT OR IGNORE INTO notifications(recipient_type,recipient_id,type,title,message,link,event_key) VALUES(?,?,?,?,?,?,?)`,
    args: [
      studentId === null ? "admin" : "student",
      studentId,
      type,
      title,
      message,
      link ??
        (studentId ? `/portal/student/${studentId}/schedule` : "/requests"),
      key,
    ],
  });
}
async function studentNotice(
  tx: Transaction,
  sid: number,
  kind: string,
  title: string,
  message: string,
  entity: string,
  link?: string,
) {
  await notify(tx, sid, kind, title, message, `${entity}:${kind}`, link);
}
function room() {
  return `tuitionhub-${randomUUID()}`;
}
type Lesson = {
  id: number;
  student_id: number;
  scheduled_at: string;
  duration_minutes: number;
  subject: string | null;
  location: string | null;
  status: string;
  attendance: string | null;
  is_trial: number;
  recurrence_id: number | null;
};
async function lesson(tx: Transaction, classId: number) {
  const c = await row<Lesson>(tx, "SELECT * FROM classes WHERE id=?", [
    id(classId),
  ]);
  if (!c) throw new ActionValidationError("Class not found");
  return c;
}
async function overlap(
  tx: Transaction,
  at: string,
  duration: number,
  exclude = 0,
) {
  const end = new Date(Date.parse(at) + duration * 60000).toISOString();
  const conflict = await row<{
    id: number;
  }>(
    tx,
    `SELECT id FROM classes WHERE id<>? AND status<>'canceled' AND julianday(scheduled_at)<julianday(?) AND julianday(scheduled_at,'+' || duration_minutes || ' minutes')>julianday(?) LIMIT 1`,
    [exclude, end, at],
  );
  if (conflict)
    throw new ActionValidationError(
      "This time overlaps another lesson. Choose a free time.",
    );
}
function duration(value: unknown) {
  return numberIn(value, 5, 1440, "Duration", true);
}
function changed(a: unknown, b: unknown) {
  return String(a ?? "") !== String(b ?? "");
}
async function insertLesson(
  tx: Transaction,
  input: {
    studentId: number;
    at: string;
    minutes: number;
    subject: string | null;
    location: string | null;
    trial: number;
    recurrence?: number | null;
    from?: number | null;
  },
) {
  await activeStudent(tx, input.studentId);
  await overlap(tx, input.at, input.minutes);
  const r = await tx.execute({
    sql: `INSERT INTO classes(student_id,scheduled_at,duration_minutes,subject,location,status,attendance,is_trial,meeting_room,recurrence_id,rescheduled_from) VALUES(?,?,?,?,?,'scheduled',NULL,?,?,?,?)`,
    args: [
      input.studentId,
      input.at,
      input.minutes,
      input.subject,
      input.location,
      input.trial,
      room(),
      input.recurrence ?? null,
      input.from ?? null,
    ],
  });
  return Number(r.lastInsertRowid);
}
async function replacement(tx: Transaction, c: Lesson, at: string) {
  if (c.status !== "scheduled" && c.status !== "canceled")
    throw new ActionValidationError(
      "Only scheduled or advance-cancelled lessons can be rescheduled",
    );
  if (c.attendance === "absent")
    throw new ActionValidationError(
      "An absent lesson cannot be rescheduled as an advance cancellation",
    );
  if (
    await row(tx, "SELECT id FROM classes WHERE rescheduled_from=? LIMIT 1", [
      c.id,
    ])
  )
    throw new ActionValidationError("This lesson already has a replacement");
  await tx.execute({
    sql: "UPDATE classes SET status='canceled',attendance=NULL,cancel_reason='Rescheduled' WHERE id=?",
    args: [c.id],
  });
  return insertLesson(tx, {
    studentId: c.student_id,
    at,
    minutes: c.duration_minutes,
    subject: c.subject,
    location: c.location,
    trial: c.is_trial,
    from: c.id,
  });
}
export async function seedAdminCredentials() {}
export async function loginAdmin(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const username = text(formData.get("username"), "Username", 100, true),
    password = text(formData.get("password"), "Password", 1000, true);
  const settings = await queryAll<{
    key: string;
    value: string;
  }>(
    "SELECT key,value FROM settings WHERE key IN ('admin_username','admin_password')",
  );
  const values = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  if (values.admin_username !== username || values.admin_password !== password)
    return { success: false, error: "Invalid username or password" };
  await createAdminSession();
  return { success: true };
}
export async function logoutAdmin() {
  await destroyAdminSession();
  redirect("/portal/admin");
}
export async function loginStudent(formData: FormData): Promise<{
  success: boolean;
  studentId?: number;
  error?: string;
}> {
  const username = text(
      formData.get("username"),
      "Username",
      100,
      true,
    ).toLowerCase(),
    password = text(formData.get("password"), "Password", 1000, true);
  const s = await queryOne<{
    id: number;
  }>(
    "SELECT id FROM students WHERE lower(username)=? AND password=? AND active=1",
    [username, password],
  );
  if (!s) return { success: false, error: "Invalid username or password" };
  await createStudentSession(s.id);
  return { success: true, studentId: s.id };
}
export async function logoutStudent() {
  await destroyStudentSession();
  redirect("/portal/student");
}
function studentValues(f: FormData) {
  return [
    text(f.get("name"), "Name", 200, true),
    ...(
      [
        "subject",
        "grade_level",
        "phone",
        "email",
        "guardian_name",
        "guardian_contact",
      ] as const
    ).map((k) => text(f.get(k), k, 500) || null),
    numberIn(f.get("hourly_rate") || 0, 0, 1000000, "Hourly rate"),
    text(f.get("notes"), "Notes", 20000) || null,
  ];
}
export async function createStudentQuick(f: FormData): Promise<number> {
  await requireAdmin();
  const values = studentValues(f);
  const sid = await withTransaction(async (tx) => {
    const base = String(values[0]).split(/\s+/)[0].toLowerCase();
    let username = base,
      n = 1;
    while (
      await row(tx, "SELECT id FROM students WHERE lower(username)=?", [
        username,
      ])
    )
      username = `${base}${++n}`;
    const r = await tx.execute({
      sql: "INSERT INTO students(name,subject,grade_level,phone,email,guardian_name,guardian_contact,hourly_rate,notes,username,password,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,1)",
      args: [...values, username, `${username}123`],
    });
    return Number(r.lastInsertRowid);
  });
  refresh(sid);
  return sid;
}
export async function createStudent(f: FormData) {
  const sid = await createStudentQuick(f);
  redirect(`/students/${sid}`);
}
export async function updateStudentQuick(studentId: number, f: FormData) {
  await requireAdmin();
  const sid = id(studentId),
    values = studentValues(f),
    active = f.get("active") === "on" ? 1 : 0;
  await withTransaction(async (tx) => {
    const previous = await row<{
      active: number;
    }>(tx, "SELECT active FROM students WHERE id=?", [sid]);
    if (!previous) throw new ActionValidationError("Student not found");
    await tx.execute({
      sql: "UPDATE students SET name=?,subject=?,grade_level=?,phone=?,email=?,guardian_name=?,guardian_contact=?,hourly_rate=?,notes=?,active=? WHERE id=?",
      args: [...values, active, sid],
    });
    if (!active) {
      await tx.execute({
        sql: "DELETE FROM student_sessions WHERE student_id=?",
        args: [sid],
      });
      await tx.execute({
        sql: "DELETE FROM settings WHERE key=?",
        args: [`student_session_${sid}`],
      });
    } else
      await studentNotice(
        tx,
        sid,
        "profile_updated",
        "Profile updated",
        "Your tutor updated your profile.",
        randomUUID(),
        `/portal/student/${sid}/profile`,
      );
  });
  refresh(sid);
}
export async function updateStudent(sid: number, f: FormData) {
  await updateStudentQuick(sid, f);
  redirect(`/students/${sid}`);
}
export async function deleteStudent(sid: number) {
  await requireAdmin();
  id(sid);
  await withTransaction(async (tx) => {
    await tx.execute({
      sql: "UPDATE students SET active=0 WHERE id=?",
      args: [sid],
    });
    await tx.execute({
      sql: "DELETE FROM student_sessions WHERE student_id=?",
      args: [sid],
    });
    await tx.execute({
      sql: "DELETE FROM settings WHERE key=?",
      args: [`student_session_${sid}`],
    });
  });
  refresh(sid);
  redirect("/students");
}
export async function createClassQuick(f: FormData): Promise<number> {
  await requireAdmin();
  const sid = id(f.get("student_id")),
    at = businessDateTime(f.get("scheduled_at")),
    minutes = duration(f.get("duration_minutes") || 60);
  const cid = await withTransaction(async (tx) => {
    const cid = await insertLesson(tx, {
      studentId: sid,
      at,
      minutes,
      subject: text(f.get("subject"), "Subject", 500) || null,
      location: text(f.get("location"), "Location", 500) || null,
      trial: f.get("is_trial") === "on" ? 1 : 0,
    });
    await studentNotice(
      tx,
      sid,
      "class_scheduled",
      "New lesson scheduled",
      "Your tutor scheduled a lesson.",
      `class:${cid}`,
    );
    return cid;
  });
  refresh(sid);
  return cid;
}
export async function createClass(f: FormData) {
  const cid = await createClassQuick(f);
  redirect(`/classes/${cid}`);
}
export async function moveClassQuick(
  classId: number,
  scheduledAt: string,
  durationMinutes: number,
) {
  await requireAdmin();
  const at = businessDateTime(scheduledAt),
    minutes = duration(durationMinutes);
  const sid = await withTransaction(async (tx) => {
    const c = await lesson(tx, classId);
    if (c.status !== "scheduled")
      throw new ActionValidationError("Only scheduled lessons can be moved");
    await activeStudent(tx, c.student_id);
    await overlap(tx, at, minutes, c.id);
    if (changed(at, c.scheduled_at) || changed(minutes, c.duration_minutes)) {
      await tx.execute({
        sql: "UPDATE classes SET scheduled_at=?,duration_minutes=? WHERE id=?",
        args: [at, minutes, c.id],
      });
      await studentNotice(
        tx,
        c.student_id,
        "class_updated",
        "Lesson time updated",
        "Your tutor changed a lesson time or duration.",
        randomUUID(),
      );
    }
    return c.student_id;
  });
  refresh(sid);
  revalidatePath(`/classes/${classId}`);
  return { success: true };
}
export async function updateClass(classId: number, f: FormData) {
  await requireAdmin();
  const at = businessDateTime(f.get("scheduled_at")),
    minutes = duration(f.get("duration_minutes") || 60),
    status = oneOf(
      f.get("status") || "scheduled",
      ["scheduled", "completed", "canceled"] as const,
      "Status",
    ),
    attendance = f.get("attendance")
      ? oneOf(f.get("attendance"), ["present", "absent"] as const, "Attendance")
      : null;
  if (status === "scheduled" && attendance)
    throw new ActionValidationError("Scheduled lessons must be unmarked");
  if (status === "canceled" && attendance)
    throw new ActionValidationError(
      "Advance-cancelled lessons have no attendance mark",
    );
  const sid = await withTransaction(async (tx) => {
    const c = await lesson(tx, classId);
    if (status !== "canceled") await overlap(tx, at, minutes, c.id);
    await tx.execute({
      sql: "UPDATE classes SET scheduled_at=?,duration_minutes=?,subject=?,location=?,status=?,attendance=? WHERE id=?",
      args: [
        at,
        minutes,
        text(f.get("subject"), "Subject", 500) || null,
        text(f.get("location"), "Location", 500) || null,
        status,
        attendance,
        c.id,
      ],
    });
    await studentNotice(
      tx,
      c.student_id,
      "class_updated",
      "Lesson updated",
      "Your tutor updated a lesson.",
      randomUUID(),
    );
    return c.student_id;
  });
  refresh(sid);
  revalidatePath(`/classes/${classId}`);
  redirect(`/classes/${classId}`);
}
export async function markAttendance(classId: number, attendance: Attendance) {
  await requireAdmin();
  const mark = oneOf(attendance, ["present", "absent"] as const, "Attendance");
  const sid = await withTransaction(async (tx) => {
    const c = await lesson(tx, classId);
    if (c.status === "canceled")
      throw new ActionValidationError(
        "Cancelled lessons are excluded from attendance",
      );
    if (c.attendance !== mark || c.status !== "completed") {
      await tx.execute({
        sql: "UPDATE classes SET attendance=?,status='completed' WHERE id=?",
        args: [mark, c.id],
      });
      await studentNotice(
        tx,
        c.student_id,
        "attendance_updated",
        "Attendance updated",
        `Your lesson was marked ${mark}.`,
        randomUUID(),
      );
    }
    return c.student_id;
  });
  refresh(sid);
  revalidatePath(`/classes/${classId}`);
}
export async function cancelClassQuick(classId: number) {
  await requireAdmin();
  const sid = await withTransaction(async (tx) => {
    const c = await lesson(tx, classId);
    if (c.status !== "canceled") {
      await tx.execute({
        sql: "UPDATE classes SET status='canceled',attendance=NULL,cancel_reason='Cancelled in advance' WHERE id=?",
        args: [c.id],
      });
      await studentNotice(
        tx,
        c.student_id,
        "class_cancelled",
        "Lesson cancelled",
        "Your tutor cancelled a lesson in advance.",
        randomUUID(),
      );
    }
    return c.student_id;
  });
  refresh(sid);
  revalidatePath(`/classes/${classId}`);
}
export async function deleteClassQuick(classId: number) {
  await cancelClassQuick(classId);
}
export async function deleteClass(classId: number) {
  await cancelClassQuick(classId);
  redirect("/schedule");
}
export async function rescheduleClassQuick(
  classId: number,
  scheduledAt: string,
) {
  await requireAdmin();
  const at = businessDateTime(scheduledAt);
  const sid = await withTransaction(async (tx) => {
    const c = await lesson(tx, classId);
    await replacement(tx, c, at);
    await studentNotice(
      tx,
      c.student_id,
      "class_rescheduled",
      "Lesson rescheduled",
      "Your tutor arranged a replacement lesson.",
      `replacement:${c.id}`,
    );
    return c.student_id;
  });
  refresh(sid);
}
export async function cancelClass(classId: number, f: FormData) {
  await requireAdmin();
  const raw = text(f.get("reschedule_date"), "Replacement time", 100),
    at = raw ? businessDateTime(raw) : null,
    reason =
      text(f.get("cancel_reason"), "Reason", 1000) || "Cancelled in advance";
  const sid = await withTransaction(async (tx) => {
    const c = await lesson(tx, classId);
    if (at) await replacement(tx, c, at);
    else
      await tx.execute({
        sql: "UPDATE classes SET status='canceled',attendance=NULL,cancel_reason=? WHERE id=?",
        args: [reason, c.id],
      });
    await studentNotice(
      tx,
      c.student_id,
      at ? "class_rescheduled" : "class_cancelled",
      at ? "Lesson rescheduled" : "Lesson cancelled",
      at
        ? "Your tutor arranged a replacement lesson."
        : "Your tutor cancelled a lesson in advance.",
      randomUUID(),
    );
    return c.student_id;
  });
  refresh(sid);
  revalidatePath(`/classes/${classId}`);
}
async function report(classId: number, f: FormData) {
  await requireAdmin();
  const fields = [
    "topics_covered",
    "homework",
    "performance",
    "strengths",
    "areas_to_improve",
    "next_focus",
  ] as const;
  const sid = await withTransaction(async (tx) => {
    const c = await lesson(tx, classId),
      old = await row<Record<string, InValue>>(
        tx,
        "SELECT * FROM reports WHERE class_id=?",
        [c.id],
      );
    const values = fields.map((k) =>
      f.has(k) ? text(f.get(k), k, 20000) || null : (old?.[k] ?? null),
    );
    const rating = f.has("rating")
      ? f.get("rating")
        ? numberIn(f.get("rating"), 1, 5, "Rating", true)
        : null
      : (old?.rating ?? null);
    await tx.execute({
      sql: `INSERT INTO reports(class_id,topics_covered,homework,performance,strengths,areas_to_improve,next_focus,rating) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(class_id) DO UPDATE SET topics_covered=excluded.topics_covered,homework=excluded.homework,performance=excluded.performance,strengths=excluded.strengths,areas_to_improve=excluded.areas_to_improve,next_focus=excluded.next_focus,rating=excluded.rating,updated_at=datetime('now')`,
      args: [c.id, ...values, rating],
    });
    await tx.execute({
      sql: "UPDATE classes SET status='completed' WHERE id=? AND status<>'canceled'",
      args: [c.id],
    });
    await studentNotice(
      tx,
      c.student_id,
      "report_updated",
      "Lesson report available",
      "Your tutor saved your lesson report.",
      randomUUID(),
      `/portal/student/${c.student_id}`,
    );
    return c.student_id;
  });
  refresh(sid);
  revalidatePath(`/classes/${classId}`);
}
export async function saveReport(classId: number, f: FormData) {
  await report(classId, f);
}
export async function saveReportQuick(classId: number, f: FormData) {
  await report(classId, f);
}
export async function generateInvoiceQuick(f: FormData): Promise<number> {
  await requireAdmin();
  const sid = id(f.get("student_id")),
    start = businessDate(f.get("period_start")),
    end = businessDate(f.get("period_end"));
  if (start > end)
    throw new ActionValidationError("Period end must follow start");
  const ids = await withTransaction(async (tx) => {
    const lessons = (
      await tx.execute({
        sql: `SELECT c.id,c.scheduled_at,c.duration_minutes,c.is_trial,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE c.student_id=? AND c.status='completed' AND c.attendance IN ('present','late') AND c.scheduled_at>=? AND c.scheduled_at<? AND NOT EXISTS(SELECT 1 FROM invoice_items ii WHERE ii.class_id=c.id) ORDER BY c.scheduled_at`,
        args: [
          sid,
          businessDateTime(`${start}T00:00`),
          businessDateTime(`${nextDate(end, 1)}T00:00`),
        ],
      })
    ).rows;
    if (!lessons.length)
      throw new ActionValidationError(
        "No present, un-invoiced lessons in this period",
      );
    const groups = new Map<string, typeof lessons>();
    for (const c of lessons) {
      const key = billingMonth(String(c.scheduled_at));
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    const ids: number[] = [];
    for (const [month, classes] of groups) {
      const [periodStart, nextMonth] = monthBounds(month);
      const items = classes.map((c) => {
        const amount = c.is_trial
          ? 0
          : Math.round(
              (Number(c.duration_minutes) / 60) * Number(c.hourly_rate) * 100,
            ) / 100;
        return { c, amount };
      });
      const total =
        Math.round(items.reduce((s, x) => s + x.amount, 0) * 100) / 100;
      const num = `INV-${month.replace("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const r = await tx.execute({
        sql: "INSERT INTO invoices(student_id,invoice_number,period_start,period_end,total_amount,status,notes,billing_month) VALUES(?,?,?,?,?,'draft',?,?)",
        args: [
          sid,
          num,
          periodStart,
          new Date(Date.parse(nextMonth) - 1).toISOString(),
          total,
          text(f.get("notes"), "Notes", 10000) || null,
          month,
        ],
      });
      const invoiceId = Number(r.lastInsertRowid);
      ids.push(invoiceId);
      await tx.batch(
        items.map(({ c, amount }) => ({
          sql: "INSERT INTO invoice_items(invoice_id,class_id,description,quantity,unit_amount,amount) VALUES(?,?,?,?,?,?)",
          args: [
            invoiceId,
            c.id,
            `${c.is_trial ? "[TRIAL] " : ""}${new Date(String(c.scheduled_at)).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" })} (${c.duration_minutes} min)`,
            Number(c.duration_minutes) / 60,
            c.is_trial ? 0 : Number(c.hourly_rate),
            amount,
          ],
        })),
      );
      await studentNotice(
        tx,
        sid,
        "invoice_created",
        "Monthly invoice available",
        `Your ${month} invoice is available.`,
        `invoice:${invoiceId}`,
        `/portal/student/${sid}/profile`,
      );
    }
    return ids;
  });
  refresh(sid);
  return ids[0];
}
export async function generateInvoice(f: FormData) {
  const invoiceId = await generateInvoiceQuick(f);
  redirect(`/invoices/${invoiceId}`);
}
export async function setInvoiceStatus(
  invoiceId: number,
  status: InvoiceStatus,
) {
  await requireAdmin();
  const valid = oneOf(
    status,
    ["draft", "sent", "paid", "overdue", "canceled"] as const,
    "Invoice status",
  );
  const sid = await withTransaction(async (tx) => {
    const inv = await row<{
      student_id: number;
      status: string;
    }>(tx, "SELECT student_id,status FROM invoices WHERE id=?", [
      id(invoiceId),
    ]);
    if (!inv) throw new ActionValidationError("Invoice not found");
    if (inv.status !== valid) {
      await tx.execute({
        sql: "UPDATE invoices SET status=?,paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,?) ELSE NULL END WHERE id=?",
        args: [valid, valid, new Date().toISOString(), invoiceId],
      });
      await studentNotice(
        tx,
        inv.student_id,
        "invoice_updated",
        "Invoice updated",
        `Your invoice status is now ${valid}.`,
        randomUUID(),
        `/portal/student/${inv.student_id}/profile`,
      );
    }
    return inv.student_id;
  });
  refresh(sid);
  revalidatePath(`/invoices/${invoiceId}`);
}
export async function deleteInvoice(invoiceId: number) {
  await setInvoiceStatus(invoiceId, "canceled");
  redirect("/invoices");
}
async function generateRecurrence(
  tx: Transaction,
  recurrenceId: number,
  through: string,
) {
  const rec = await row<{
    student_id: number;
    day_of_week: number;
    time: string;
    duration_minutes: number;
    subject: string | null;
    location: string | null;
    frequency: string;
    custom_interval_days: number | null;
    start_date: string;
    generated_through: string | null;
  }>(tx, "SELECT * FROM recurrences WHERE id=?", [recurrenceId]);
  if (!rec) throw new ActionValidationError("Recurring schedule not found");
  let cursor = rec.start_date;
  while (new Date(`${cursor}T00:00:00Z`).getUTCDay() !== rec.day_of_week)
    cursor = nextDate(cursor, 1);
  const step =
    rec.frequency === "biweekly"
      ? 14
      : rec.frequency === "custom"
        ? id(rec.custom_interval_days)
        : 7;
  let count = 0;
  while (cursor <= through) {
    if (!rec.generated_through || cursor > rec.generated_through) {
      if (++count > 370)
        throw new ActionValidationError("Too many lessons in one generation");
      const at = businessDateTime(`${cursor}T${rec.time}`);
      if (
        !(await row(
          tx,
          "SELECT id FROM classes WHERE recurrence_id=? AND scheduled_at=?",
          [recurrenceId, at],
        ))
      )
        await insertLesson(tx, {
          studentId: rec.student_id,
          at,
          minutes: rec.duration_minutes,
          subject: rec.subject,
          location: rec.location,
          trial: 0,
          recurrence: recurrenceId,
        });
    }
    cursor = nextDate(cursor, step);
  }
  await tx.execute({
    sql: "UPDATE recurrences SET generated_through=?,end_date=? WHERE id=?",
    args: [through, through, recurrenceId],
  });
  return rec.student_id;
}
export async function createRecurrenceQuick(f: FormData) {
  await requireAdmin();
  const sid = id(f.get("student_id")),
    days = [
      ...new Set(
        f.getAll("day_of_week").map((d) => numberIn(d, 0, 6, "Weekday", true)),
      ),
    ];
  if (!days.length)
    throw new ActionValidationError("Select at least one weekday");
  const start = businessDate(f.get("start_date")),
    end = f.get("end_date")
      ? businessDate(f.get("end_date"))
      : `${start.slice(0, 4)}-12-31`;
  if (end < start || end > `${start.slice(0, 4)}-12-31`)
    throw new ActionValidationError(
      "Choose an end date within the start calendar year",
    );
  const time = text(f.get("time"), "Time", 5, true);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new ActionValidationError("Time is invalid");
  const frequency = oneOf(
      f.get("frequency") || "weekly",
      ["weekly", "biweekly", "custom"] as const,
      "Frequency",
    ),
    interval =
      frequency === "custom"
        ? numberIn(f.get("custom_interval_days"), 1, 366, "Interval", true)
        : null;
  await withTransaction(async (tx) => {
    for (const day of days) {
      const r = await tx.execute({
        sql: "INSERT INTO recurrences(student_id,day_of_week,time,duration_minutes,subject,location,frequency,custom_interval_days,start_date,end_date) VALUES(?,?,?,?,?,?,?,?,?,?)",
        args: [
          sid,
          day,
          time,
          duration(f.get("duration_minutes") || 60),
          text(f.get("subject"), "Subject", 500) || null,
          text(f.get("location"), "Location", 500) || null,
          frequency,
          interval,
          start,
          end,
        ],
      });
      const recId = Number(r.lastInsertRowid);
      await generateRecurrence(tx, recId, end);
      await studentNotice(
        tx,
        sid,
        "schedule_updated",
        "Recurring lessons scheduled",
        `Your recurring lessons are scheduled through ${end}.`,
        `recurrence:${recId}:${end}`,
      );
    }
  });
  refresh(sid);
}
export async function createRecurrence(f: FormData) {
  await createRecurrenceQuick(f);
  redirect("/schedule");
}
export async function extendRecurrence(recurrenceId: number, endDate: string) {
  await requireAdmin();
  const through = businessDate(endDate);
  const sid = await withTransaction(async (tx) => {
    const rec = await row<{
      active: number;
      generated_through: string;
      start_date: string;
    }>(
      tx,
      "SELECT active,generated_through,start_date FROM recurrences WHERE id=?",
      [id(recurrenceId)],
    );
    if (!rec || !rec.active)
      throw new ActionValidationError("Recurring schedule is inactive");
    if (through <= rec.generated_through)
      throw new ActionValidationError(
        "Choose a date after the generated horizon",
      );
    if (
      through >
      `${String(Number((rec.generated_through || rec.start_date).slice(0, 4)) + 1)}-12-31`
    )
      throw new ActionValidationError(
        "Extend at most one calendar year at a time",
      );
    const sid = await generateRecurrence(tx, recurrenceId, through);
    await studentNotice(
      tx,
      sid,
      "schedule_updated",
      "Recurring lessons extended",
      `Your lessons are scheduled through ${through}.`,
      `recurrence:${recurrenceId}:${through}`,
    );
    return sid;
  });
  refresh(sid);
  return { success: true };
}
export async function stopRecurrence(recurrenceId: number) {
  await requireAdmin();
  const sid = await withTransaction(async (tx) => {
    const r = await row<{
      student_id: number;
      active: number;
    }>(tx, "SELECT student_id,active FROM recurrences WHERE id=?", [
      id(recurrenceId),
    ]);
    if (!r) throw new ActionValidationError("Recurring schedule not found");
    if (r.active) {
      await tx.execute({
        sql: "UPDATE classes SET status='canceled',attendance=NULL,cancel_reason='Recurring schedule stopped' WHERE recurrence_id=? AND status='scheduled' AND julianday(scheduled_at)>julianday(?)",
        args: [recurrenceId, new Date().toISOString()],
      });
      await tx.execute({
        sql: "UPDATE recurrences SET active=0 WHERE id=?",
        args: [recurrenceId],
      });
      await studentNotice(
        tx,
        r.student_id,
        "schedule_updated",
        "Recurring lessons stopped",
        "Your tutor stopped future lessons in a recurring schedule.",
        `recurrence:${recurrenceId}:stop`,
      );
    }
    return r.student_id;
  });
  refresh(sid);
  return { success: true };
}
export async function deleteRecurrence(recurrenceId: number) {
  await stopRecurrence(recurrenceId);
  redirect("/schedule");
}
export async function addHoliday(_f: FormData) {
  await requireAdmin();
  throw new ActionValidationError("Holiday scheduling is no longer supported");
}
export async function deleteHoliday(_holidayId: number) {
  await requireAdmin();
  throw new ActionValidationError("Holiday scheduling is no longer supported");
}
// Administrative notes and read-only parent access.
export async function addStudentNote(studentId: number, f: FormData) {
  await requireAdmin();
  const sid = id(studentId),
    content = text(f.get("content"), "Note", 20000, true);
  await withTransaction(async (tx) => {
    if (!(await row(tx, "SELECT id FROM students WHERE id=?", [sid])))
      throw new ActionValidationError("Student not found");
    await tx.execute({
      sql: "INSERT INTO student_notes(student_id,content) VALUES(?,?)",
      args: [sid, content],
    });
  });
  revalidatePath(`/students/${sid}`);
}
export async function deleteStudentNote(noteId: number, studentId: number) {
  await requireAdmin();
  await execute("DELETE FROM student_notes WHERE id=? AND student_id=?", [
    id(noteId),
    id(studentId),
  ]);
  revalidatePath(`/students/${studentId}`);
}
export async function generateShareToken(studentId: number) {
  await requireAdmin();
  const sid = id(studentId),
    token = randomUUID();
  await withTransaction(async (tx) => {
    await activeStudent(tx, sid);
    await tx.execute({
      sql: "UPDATE share_tokens SET active=0 WHERE student_id=?",
      args: [sid],
    });
    await tx.execute({
      sql: "INSERT INTO share_tokens(student_id,token) VALUES(?,?)",
      args: [sid, token],
    });
  });
  refresh(sid);
  return token;
}
export async function revokeShareToken(studentId: number) {
  await requireAdmin();
  await execute("UPDATE share_tokens SET active=0 WHERE student_id=?", [
    id(studentId),
  ]);
  refresh(studentId);
}
export async function saveSettings(f: FormData) {
  await requireAdmin();
  const keys = [
    "business_name",
    "business_contact",
    "currency",
    "payment_instructions",
  ] as const;
  const values = keys.map((key) =>
    text(
      f.get(key),
      key,
      key === "payment_instructions" ? 10000 : 500,
      key === "currency" || key === "business_name",
    ),
  );
  await withTransaction(async (tx) => {
    await tx.batch(
      keys.map((key, index) => ({
        sql: "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        args: [key, values[index]],
      })),
    );
  });
  refresh();
  revalidatePath("/settings");
  redirect("/settings");
}
export async function saveDuitNowQR(f: FormData) {
  await requireAdmin();
  const file = f.get("qr_image");
  if (!file || typeof file === "string" || file.size === 0)
    throw new ActionValidationError("Choose a QR image");
  if (file.size > 512000)
    throw new ActionValidationError("QR image must be under 500KB");
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    throw new ActionValidationError("Use a PNG, JPG, WebP or GIF QR image");
  const url = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  await execute(
    "INSERT INTO settings(key,value) VALUES('duitnow_qr',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [url],
  );
  refresh();
  revalidatePath("/settings");
}
export async function removeDuitNowQR() {
  await requireAdmin();
  await execute("DELETE FROM settings WHERE key='duitnow_qr'");
  refresh();
  revalidatePath("/settings");
}
type ClassroomPost = {
  id: number;
  student_id: number | null;
  type: string;
  title: string;
  body: string | null;
  due_at: string | null;
  topic_id: number | null;
  max_points: number | null;
};
async function post(tx: Transaction, postId: number) {
  const p = await row<ClassroomPost>(
    tx,
    "SELECT id,student_id,type,title,body,due_at,topic_id,max_points FROM posts WHERE id=?",
    [id(postId)],
  );
  if (!p || !p.student_id) throw new ActionValidationError("Post not found");
  return p;
}
async function ownPost(
  tx: Transaction,
  postId: number,
  sid: number,
  type?: string,
) {
  const p = await post(tx, postId);
  if (p.student_id !== sid || (type && p.type !== type))
    throw new ActionValidationError("This work is not assigned to you");
  await activeStudent(tx, sid);
  return p;
}
async function topicOwner(
  tx: Transaction,
  topicId: number | null,
  sid: number,
) {
  if (
    topicId !== null &&
    !(await row(tx, "SELECT id FROM topics WHERE id=? AND student_id=?", [
      id(topicId),
      sid,
    ]))
  )
    throw new ActionValidationError("Topic does not belong to this classroom");
}
function points(value: unknown) {
  return value === null || value === undefined || value === ""
    ? null
    : numberIn(value, 1, 100000, "Maximum points");
}
export async function createPostAction(
  studentId: number,
  type: string,
  title: string,
  body: string,
  dueAt: string | null,
  topicId: number | null = null,
  maxPoints: number | null = null,
): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAdmin();
  try {
    const sid = id(studentId),
      kind = oneOf(
        type,
        ["material", "assignment", "quiz", "announcement"] as const,
        "Post type",
      );
    const heading = text(title, "Title", 500, true),
      content = text(body, "Content", 50000) || null,
      due = dueAt ? businessDateTime(dueAt) : null,
      maximum =
        kind === "assignment" || kind === "quiz" ? points(maxPoints) : null;
    await withTransaction(async (tx) => {
      await activeStudent(tx, sid);
      await topicOwner(tx, topicId, sid);
      const result = await tx.execute({
        sql: "INSERT INTO posts(type,title,body,student_id,due_at,topic_id,max_points,sort_order) VALUES(?,?,?,?,?,?,?,(SELECT COALESCE(MIN(sort_order),0)-1 FROM posts WHERE student_id=? AND topic_id IS ?))",
        args: [
          kind,
          heading,
          content,
          sid,
          due,
          topicId,
          maximum,
          sid,
          topicId,
        ],
      });
      const pid = Number(result.lastInsertRowid);
      await studentNotice(
        tx,
        sid,
        "post_created",
        kind === "assignment"
          ? "New assignment"
          : kind === "announcement"
            ? "New announcement"
            : "New class material",
        `${heading} was posted in your classroom.`,
        `post:${pid}`,
        `/portal/student/${sid}/classroom/post/${pid}`,
      );
    });
    refresh(sid);
    return { success: true };
  } catch (reason) {
    return { success: false, error: publicMessage(reason) };
  }
}
export async function updatePost(f: FormData) {
  await requireAdmin();
  const pid = id(f.get("id"));
  const sid = await withTransaction(async (tx) => {
    const old = await post(tx, pid),
      sid = old.student_id!;
    const title = text(f.get("title"), "Title", 500, true),
      body = text(f.get("body"), "Content", 50000) || null;
    const due = f.get("due_at") ? businessDateTime(f.get("due_at")) : null,
      topic = f.get("topic_id") ? id(f.get("topic_id")) : null,
      maximum = points(f.get("max_points"));
    await topicOwner(tx, topic, sid);
    if (
      [title, body, due, topic, maximum].every(
        (value, index) =>
          !changed(
            value,
            [old.title, old.body, old.due_at, old.topic_id, old.max_points][
              index
            ],
          ),
      )
    )
      return sid;
    // Preserve the validity of already-issued numeric grades when a rubric is edited.
    if (maximum !== null && old.max_points !== maximum) {
      const invalid = await row(
        tx,
        "SELECT id FROM submissions WHERE post_id=? AND grade IS NOT NULL AND (CAST(grade AS REAL)>? OR CAST(grade AS REAL)<0) LIMIT 1",
        [pid, maximum],
      );
      if (invalid)
        throw new ActionValidationError(
          "This maximum would invalidate an existing grade; keep the current maximum",
        );
    }
    await tx.execute({
      sql: "UPDATE posts SET title=?,body=?,due_at=?,topic_id=?,max_points=?,updated_at=? WHERE id=?",
      args: [title, body, due, topic, maximum, new Date().toISOString(), pid],
    });
    await studentNotice(
      tx,
      sid,
      "post_updated",
      "Classwork updated",
      `Your tutor edited ${title}.`,
      randomUUID(),
      `/portal/student/${sid}/classroom/post/${pid}`,
    );
    return sid;
  });
  refresh(sid);
  revalidatePath(`/classroom/${sid}/post/${pid}`);
  revalidatePath(`/portal/student/${sid}/classroom/post/${pid}`);
}
export async function deletePostAction(
  postId: number,
  studentId: number,
): Promise<{
  success: boolean;
}> {
  await requireAdmin();
  const sid = id(studentId);
  await withTransaction(async (tx) => {
    const p = await post(tx, postId);
    if (p.student_id !== sid)
      throw new ActionValidationError("Post not found in this classroom");
    await tx.execute({ sql: "DELETE FROM posts WHERE id=?", args: [p.id] });
    await studentNotice(
      tx,
      sid,
      "post_removed",
      "Classwork removed",
      `Your tutor removed ${p.title}.`,
      randomUUID(),
      `/portal/student/${sid}/classroom`,
    );
  });
  refresh(sid);
  return { success: true };
}
export async function deletePost(postId: number, studentId?: number) {
  await requireAdmin();
  const p = await queryOne<{
    student_id: number;
  }>("SELECT student_id FROM posts WHERE id=?", [id(postId)]);
  if (!p || (studentId !== undefined && p.student_id !== studentId))
    throw new ActionValidationError("Post not found");
  await deletePostAction(postId, p.student_id);
}
// The projection holds the latest attempt; every attempt and its grade remains in history.
export async function submitAssignment(f: FormData) {
  const sid = await studentSession(
      f.has("student_id") ? id(f.get("student_id")) : undefined,
    ),
    pid = id(f.get("post_id"));
  const content = text(f.get("content"), "Your work", 10000) || null,
    link = safeUrl(f.get("file_url"));
  if (!content && !link)
    throw new ActionValidationError(
      "Add your work or an attachment before turning in",
    );
  await withTransaction(async (tx) => {
    const assignedPost = await ownPost(tx, pid, sid, "assignment");
    const old = await row<{
      id: number;
      version: number;
      content: string | null;
      file_url: string | null;
    }>(
      tx,
      "SELECT id,version,content,file_url FROM submissions WHERE post_id=? AND student_id=?",
      [pid, sid],
    );
    // A network retry of the identical latest attempt should not create another lineage entry.
    if (old && old.content === content && old.file_url === link) return;
    const version = old ? old.version + 1 : 1,
      now = new Date().toISOString();
    let submissionId: number;
    if (old) {
      submissionId = old.id;
      await tx.execute({
        sql: "UPDATE submissions SET content=?,file_url=?,version=?,grade=NULL,feedback=NULL,graded_at=NULL,submitted_at=? WHERE id=?",
        args: [content, link, version, now, old.id],
      });
    } else {
      const result = await tx.execute({
        sql: "INSERT INTO submissions(post_id,student_id,content,file_url,version,submitted_at) VALUES(?,?,?,?,?,?)",
        args: [pid, sid, content, link, version, now],
      });
      submissionId = Number(result.lastInsertRowid);
    }
    await tx.execute({
      sql: "INSERT INTO submission_versions(submission_id,version,content,file_url,submitted_at,max_points) VALUES(?,?,?,?,?,?)",
      args: [
        submissionId,
        version,
        content,
        link,
        now,
        assignedPost.max_points,
      ],
    });
    await notify(
      tx,
      null,
      "work_submitted",
      "New student work",
      `A student submitted attempt ${version}.`,
      `submission:${submissionId}:version:${version}`,
      `/classroom/${sid}/post/${pid}`,
    );
    await studentNotice(
      tx,
      sid,
      "work_submitted",
      "Work turned in",
      `Attempt ${version} was saved for your tutor to grade.`,
      `submission:${submissionId}:version:${version}`,
      `/portal/student/${sid}/classroom/post/${pid}`,
    );
  });
  refresh(sid);
  revalidatePath(`/classroom/${sid}/post/${pid}`);
  revalidatePath(`/portal/student/${sid}/classroom/post/${pid}`);
}
export async function gradeSubmissionAction(
  submissionId: number,
  grade: string,
  feedback: string,
  studentId: number,
  expectedVersion: number,
): Promise<{
  success: boolean;
}> {
  await requireAdmin();
  const sid = id(studentId),
    version = id(expectedVersion, "Attempt"),
    score = text(grade, "Grade", 100, true),
    comments = text(feedback, "Feedback", 10000) || null;
  const pid = await withTransaction(async (tx) => {
    const submission = await row<{
      id: number;
      student_id: number;
      post_id: number;
      version: number;
      grade: string | null;
      feedback: string | null;
      graded_at: string | null;
      max_points: number | null;
    }>(
      tx,
      "SELECT s.*,p.max_points FROM submissions s JOIN posts p ON p.id=s.post_id WHERE s.id=? AND p.student_id=s.student_id",
      [id(submissionId)],
    );
    if (!submission || submission.student_id !== sid)
      throw new ActionValidationError("Submission not found");
    if (submission.version !== version)
      throw new ActionValidationError(
        "Newer work has arrived. Reload and grade only the latest attempt.",
      );
    if (submission.max_points !== null)
      numberIn(score, 0, submission.max_points, "Grade");
    if (
      submission.grade === score &&
      submission.feedback === comments &&
      submission.graded_at
    )
      return submission.post_id;
    const now = new Date().toISOString();
    await tx.execute({
      sql: "UPDATE submissions SET grade=?,feedback=?,graded_at=? WHERE id=? AND version=?",
      args: [score, comments, now, submissionId, version],
    });
    await tx.execute({
      sql: "UPDATE submission_versions SET grade=?,feedback=?,graded_at=?,max_points=? WHERE submission_id=? AND version=?",
      args: [
        score,
        comments,
        now,
        submission.max_points,
        submissionId,
        version,
      ],
    });
    await studentNotice(
      tx,
      sid,
      "grade_returned",
      "Your work was graded",
      `Your tutor returned feedback for attempt ${version}.`,
      randomUUID(),
      `/portal/student/${sid}/classroom/post/${submission.post_id}`,
    );
    return submission.post_id;
  });
  refresh(sid);
  revalidatePath(`/classroom/${sid}/post/${pid}`);
  revalidatePath(`/portal/student/${sid}/classroom/post/${pid}`);
  return { success: true };
}
export async function gradeSubmission(submissionId: number, f: FormData) {
  await requireAdmin();
  const s = await queryOne<{
    student_id: number;
  }>("SELECT student_id FROM submissions WHERE id=?", [id(submissionId)]);
  if (!s) throw new ActionValidationError("Submission not found");
  await gradeSubmissionAction(
    submissionId,
    String(f.get("grade") ?? ""),
    String(f.get("feedback") ?? ""),
    s.student_id,
    id(f.get("version"), "Attempt"),
  );
}
export async function submitQuizAnswers(f: FormData) {
  const sid = await studentSession(
      f.has("student_id") ? id(f.get("student_id")) : undefined,
    ),
    pid = id(f.get("post_id"));
  await withTransaction(async (tx) => {
    await ownPost(tx, pid, sid, "quiz");
    const questions = (
      await tx.execute({
        sql: "SELECT id,type,correct_answer FROM quiz_questions WHERE post_id=? ORDER BY sort_order",
        args: [pid],
      })
    ).rows;
    const answers = questions
      .map((q) => ({
        id: Number(q.id),
        answer: text(f.get(`answer_${q.id}`), "Answer", 10000),
        type: q.type,
        correct: q.correct_answer,
      }))
      .filter((a) => a.answer);
    if (!answers.length)
      throw new ActionValidationError(
        "Answer at least one question before submitting",
      );
    await tx.execute({
      sql: "DELETE FROM quiz_answers WHERE question_id IN (SELECT id FROM quiz_questions WHERE post_id=?) AND student_id=?",
      args: [pid, sid],
    });
    await tx.batch(
      answers.map((a) => ({
        sql: "INSERT INTO quiz_answers(question_id,student_id,answer,is_correct) VALUES(?,?,?,?)",
        args: [
          a.id,
          sid,
          a.answer,
          a.type === "mcq" && a.correct
            ? Number(
                a.answer.toLowerCase() ===
                  String(a.correct).trim().toLowerCase(),
              )
            : null,
        ],
      })),
    );
    await notify(
      tx,
      null,
      "quiz_submitted",
      "Quiz work submitted",
      "A student submitted quiz answers.",
      randomUUID(),
      `/classroom/${sid}/post/${pid}`,
    );
  });
  refresh(sid);
}
export async function createTopic(
  studentId: number,
  name: string,
): Promise<{
  success: boolean;
  id?: number;
}> {
  await requireAdmin();
  const sid = id(studentId),
    label = text(name, "Topic name", 200, true);
  const topicId = await withTransaction(async (tx) => {
    await activeStudent(tx, sid);
    const order = await row<{
      next: number;
    }>(
      tx,
      "SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM topics WHERE student_id=?",
      [sid],
    );
    const result = await tx.execute({
      sql: "INSERT INTO topics(student_id,name,sort_order) VALUES(?,?,?)",
      args: [sid, label, order?.next ?? 0],
    });
    await studentNotice(
      tx,
      sid,
      "classroom_updated",
      "Classroom topic added",
      `Your tutor added the ${label} topic.`,
      randomUUID(),
      `/portal/student/${sid}/classroom`,
    );
    return Number(result.lastInsertRowid);
  });
  refresh(sid);
  return { success: true, id: topicId };
}
export async function renameTopic(
  topicId: number,
  name: string,
  studentId: number,
): Promise<{
  success: boolean;
}> {
  await requireAdmin();
  const sid = id(studentId),
    label = text(name, "Topic name", 200, true);
  await withTransaction(async (tx) => {
    const old = await row<{
      name: string;
    }>(tx, "SELECT name FROM topics WHERE id=? AND student_id=?", [
      id(topicId),
      sid,
    ]);
    if (!old) throw new ActionValidationError("Topic not found");
    if (old.name !== label) {
      await tx.execute({
        sql: "UPDATE topics SET name=? WHERE id=? AND student_id=?",
        args: [label, topicId, sid],
      });
      await studentNotice(
        tx,
        sid,
        "classroom_updated",
        "Classroom topic updated",
        `Your tutor renamed a classroom topic to ${label}.`,
        randomUUID(),
        `/portal/student/${sid}/classroom`,
      );
    }
  });
  refresh(sid);
  return { success: true };
}
export async function deleteTopic(
  topicId: number,
  studentId: number,
): Promise<{
  success: boolean;
}> {
  await requireAdmin();
  const sid = id(studentId);
  await withTransaction(async (tx) => {
    if (
      !(await row(tx, "SELECT id FROM topics WHERE id=? AND student_id=?", [
        id(topicId),
        sid,
      ]))
    )
      throw new ActionValidationError("Topic not found");
    await tx.execute({
      sql: "DELETE FROM topics WHERE id=? AND student_id=?",
      args: [topicId, sid],
    });
    await studentNotice(
      tx,
      sid,
      "classroom_updated",
      "Classroom organization updated",
      "Your tutor removed a topic; its work remains in your classroom.",
      randomUUID(),
      `/portal/student/${sid}/classroom`,
    );
  });
  refresh(sid);
  return { success: true };
}
export async function addPostAttachment(
  postId: number,
  fileName: string,
  fileUrl: string,
  fileType: string | null,
  studentId: number,
): Promise<{
  success: boolean;
}> {
  await requireAdmin();
  const sid = id(studentId),
    name = text(fileName, "File name", 500, true),
    url = safeUrl(fileUrl);
  if (!url) throw new ActionValidationError("File URL is required");
  await withTransaction(async (tx) => {
    const p = await post(tx, postId);
    if (p.student_id !== sid) throw new ActionValidationError("Post not found");
    await tx.execute({
      sql: "INSERT INTO post_attachments(post_id,file_name,file_url,file_type) VALUES(?,?,?,?)",
      args: [p.id, name, url, text(fileType, "File type", 200) || null],
    });
    await studentNotice(
      tx,
      sid,
      "post_updated",
      "Classwork attachment added",
      `Your tutor added a file to ${p.title}.`,
      randomUUID(),
      `/portal/student/${sid}/classroom/post/${p.id}`,
    );
  });
  refresh(sid);
  return { success: true };
}
export async function deletePostAttachment(
  attachmentId: number,
  studentId: number,
): Promise<{
  success: boolean;
}> {
  await requireAdmin();
  const sid = id(studentId);
  await withTransaction(async (tx) => {
    const attachment = await row<{
      post_id: number;
      title: string;
    }>(
      tx,
      "SELECT a.post_id,p.title FROM post_attachments a JOIN posts p ON p.id=a.post_id WHERE a.id=? AND p.student_id=?",
      [id(attachmentId), sid],
    );
    if (!attachment) throw new ActionValidationError("Attachment not found");
    await tx.execute({
      sql: "DELETE FROM post_attachments WHERE id=?",
      args: [attachmentId],
    });
    await studentNotice(
      tx,
      sid,
      "post_updated",
      "Classwork attachment removed",
      `Your tutor removed a file from ${attachment.title}.`,
      randomUUID(),
      `/portal/student/${sid}/classroom/post/${attachment.post_id}`,
    );
  });
  refresh(sid);
  return { success: true };
}
// Private notes deliberately remain outside student event notifications.
async function upsertNote(
  classId: number,
  scope: "teacher" | "student",
  content: string,
) {
  const cid = id(classId),
    value = text(content, "Notes", 50000);
  if (scope === "teacher") await requireAdmin();
  const sid = scope === "student" ? await studentSession() : null;
  await withTransaction(async (tx) => {
    const c = await lesson(tx, cid);
    if (sid !== null && c.student_id !== sid)
      throw new ActionValidationError("Not authorized for this lesson");
    await tx.execute({
      sql: "INSERT INTO class_notes(class_id,scope,content,updated_at) VALUES(?,?,?,?) ON CONFLICT(class_id,scope) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at",
      args: [cid, scope, value, new Date().toISOString()],
    });
  });
  if (sid !== null) {
    revalidatePath(`/portal/student/${sid}/notes`);
    revalidatePath(`/portal/student/${sid}`);
  } else {
    revalidatePath(`/classes/${cid}`);
    revalidatePath("/schedule");
  }
}
export async function saveTeacherNotes(classId: number, notes: string) {
  await upsertNote(classId, "teacher", notes);
}
export async function saveStudentNotes(classId: number, notes: string) {
  await upsertNote(classId, "student", notes);
}
export async function saveClassNotes(
  classId: number,
  scope: "teacher" | "student",
  content: string,
) {
  oneOf(scope, ["teacher", "student"] as const, "Note scope");
  await upsertNote(classId, scope, content);
}
export async function saveMeetingNotes(classId: number, notes: string) {
  await saveTeacherNotes(classId, notes);
}
export async function createRescheduleRequest(f: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  const sid = await studentSession(
    f.has("student_id") ? id(f.get("student_id")) : undefined,
  );
  try {
    const classId = id(f.get("class_id")),
      reason = text(f.get("reason"), "Reason", 2000) || null;
    const times = [
      f.get("preferred_time_1"),
      f.get("preferred_time_2"),
      f.get("preferred_time_3"),
    ].map((value, index) =>
      index === 0 || value ? businessDateTime(value) : null,
    );
    if (times.some((at) => at && Date.parse(at) <= Date.now()))
      throw new ActionValidationError("Choose future preferred times");
    const supplied = times.filter(Boolean);
    if (new Set(supplied).size !== supplied.length)
      throw new ActionValidationError("Choose different preferred times");
    await withTransaction(async (tx) => {
      const c = await lesson(tx, classId);
      if (c.student_id !== sid)
        throw new ActionValidationError("This lesson does not belong to you");
      if (c.status !== "scheduled" || Date.parse(c.scheduled_at) <= Date.now())
        throw new ActionValidationError(
          "Only upcoming scheduled lessons can be requested",
        );
      if (
        await row(
          tx,
          "SELECT id FROM reschedule_requests WHERE class_id=? AND status='pending'",
          [classId],
        )
      )
        throw new ActionValidationError(
          "This lesson already has a pending request",
        );
      const result = await tx.execute({
        sql: "INSERT INTO reschedule_requests(class_id,student_id,reason,preferred_time_1,preferred_time_2,preferred_time_3) VALUES(?,?,?,?,?,?)",
        args: [classId, sid, reason, times[0], times[1], times[2]],
      });
      const requestId = Number(result.lastInsertRowid);
      await notify(
        tx,
        null,
        "reschedule_request",
        "Reschedule request",
        "A student requested a new lesson time.",
        `request:${requestId}:created`,
        "/requests",
      );
      await studentNotice(
        tx,
        sid,
        "reschedule_pending",
        "Reschedule request received",
        "Your original lesson remains scheduled while your tutor reviews your request.",
        `request:${requestId}`,
        `/portal/student/${sid}/schedule`,
      );
    });
    refresh(sid);
    return { success: true };
  } catch (reason) {
    return { error: publicMessage(reason) };
  }
}
type ScheduleRequest = {
  id: number;
  class_id: number;
  student_id: number;
  status: string;
};
export async function approveRescheduleRequest(
  requestId: number,
  approvedTime: string,
  adminNote: string | null,
): Promise<{
  success?: boolean;
  error?: string;
}> {
  await requireAdmin();
  try {
    const at = businessDateTime(approvedTime),
      note = text(adminNote, "Tutor note", 2000) || null;
    if (Date.parse(at) <= Date.now())
      throw new ActionValidationError("Choose a future replacement time");
    const sid = await withTransaction(async (tx) => {
      const request = await row<ScheduleRequest>(
        tx,
        "SELECT id,class_id,student_id,status FROM reschedule_requests WHERE id=?",
        [id(requestId)],
      );
      if (!request) throw new ActionValidationError("Request not found");
      if (request.status !== "pending")
        throw new ActionValidationError(
          "This request has already been resolved",
        );
      const c = await lesson(tx, request.class_id);
      if (c.student_id !== request.student_id)
        throw new ActionValidationError(
          "Request ownership does not match the lesson",
        );
      if (c.status !== "scheduled")
        throw new ActionValidationError(
          "The original lesson is no longer scheduled",
        );
      await replacement(tx, c, at);
      await tx.execute({
        sql: "UPDATE reschedule_requests SET status='approved',approved_time=?,admin_note=?,resolved_at=? WHERE id=? AND status='pending'",
        args: [at, note, new Date().toISOString(), request.id],
      });
      await studentNotice(
        tx,
        c.student_id,
        "reschedule_approved",
        "Reschedule approved",
        note
          ? `Your new time was approved. ${note}`
          : "Your tutor approved your new lesson time.",
        `request:${request.id}`,
        `/portal/student/${c.student_id}/schedule`,
      );
      return c.student_id;
    });
    refresh(sid);
    return { success: true };
  } catch (reason) {
    return { error: publicMessage(reason) };
  }
}
export async function rejectRescheduleRequest(
  requestId: number,
  adminNote: string | null,
): Promise<{
  success?: boolean;
  error?: string;
}> {
  await requireAdmin();
  try {
    const note = text(adminNote, "Tutor note", 2000) || null;
    const sid = await withTransaction(async (tx) => {
      const request = await row<ScheduleRequest>(
        tx,
        "SELECT id,class_id,student_id,status FROM reschedule_requests WHERE id=?",
        [id(requestId)],
      );
      if (!request) throw new ActionValidationError("Request not found");
      if (request.status !== "pending")
        throw new ActionValidationError(
          "This request has already been resolved",
        );
      const c = await lesson(tx, request.class_id);
      if (c.student_id !== request.student_id)
        throw new ActionValidationError(
          "Request ownership does not match the lesson",
        );
      await tx.execute({
        sql: "UPDATE reschedule_requests SET status='rejected',admin_note=?,resolved_at=? WHERE id=? AND status='pending'",
        args: [note, new Date().toISOString(), request.id],
      });
      await studentNotice(
        tx,
        c.student_id,
        "reschedule_rejected",
        "Reschedule request declined",
        note
          ? `Your tutor declined the request: ${note}`
          : "Your tutor declined this request. The original lesson time is unchanged.",
        `request:${request.id}`,
        `/portal/student/${c.student_id}/schedule`,
      );
      return c.student_id;
    });
    refresh(sid);
    return { success: true };
  } catch (reason) {
    return { error: publicMessage(reason) };
  }
}
type NotificationRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: number;
  created_at: string;
};
async function notificationScope(
  type: "admin" | "student",
  suppliedId: number | null,
) {
  oneOf(type, ["admin", "student"] as const, "Recipient");
  if (type === "admin") {
    await requireAdmin();
    return { where: "recipient_type='admin'", args: [] as InValue[] };
  }
  const sid = await studentSession(
    suppliedId === null ? undefined : id(suppliedId),
  );
  return {
    where: "recipient_type='student' AND recipient_id=?",
    args: [sid] as InValue[],
  };
}
export async function getNotifications(
  recipientType: "admin" | "student",
  recipientId: number | null,
  limit = 20,
) {
  const scope = await notificationScope(recipientType, recipientId),
    count = numberIn(limit, 1, 100, "Notification limit", true);
  return queryAll<NotificationRow>(
    `SELECT id,type,title,message,link,read,created_at FROM notifications WHERE ${scope.where} ORDER BY created_at DESC,id DESC LIMIT ?`,
    [...scope.args, count],
  );
}
export async function getNotificationSummary(
  recipientType: "admin" | "student",
  recipientId: number | null,
) {
  const scope = await notificationScope(recipientType, recipientId);
  const [notifications, count] = await Promise.all([
    queryAll<NotificationRow>(
      `SELECT id,type,title,message,link,read,created_at FROM notifications WHERE ${scope.where} ORDER BY created_at DESC,id DESC LIMIT 50`,
      scope.args,
    ),
    queryOne<{
      count: number;
    }>(
      `SELECT COUNT(*) AS count FROM notifications WHERE ${scope.where} AND read=0`,
      scope.args,
    ),
  ]);
  return { notifications, unreadCount: Number(count?.count ?? 0) };
}
export async function markNotificationRead(notificationId: number) {
  const target = await queryOne<{
    recipient_type: "admin" | "student";
    recipient_id: number | null;
  }>("SELECT recipient_type,recipient_id FROM notifications WHERE id=?", [
    id(notificationId),
  ]);
  if (!target) {
    if (!(await verifyAdminSession())) await studentSession();
    return;
  }
  const scope = await notificationScope(
    target.recipient_type,
    target.recipient_id,
  );
  await execute(
    `UPDATE notifications SET read=1 WHERE id=? AND ${scope.where}`,
    [notificationId, ...scope.args],
  );
  revalidatePath("/notifications");
  if (target.recipient_id)
    revalidatePath(`/portal/student/${target.recipient_id}/notifications`);
}
export async function markAllNotificationsRead(
  recipientType: "admin" | "student",
  recipientId: number | null,
) {
  const scope = await notificationScope(recipientType, recipientId);
  await execute(
    `UPDATE notifications SET read=1 WHERE ${scope.where} AND read=0`,
    scope.args,
  );
  revalidatePath("/notifications");
  if (recipientType === "student")
    revalidatePath(`/portal/student/${recipientId}/notifications`);
}
// Expected errors can cross the production server-action boundary without losing their message.
function publicMessage(reason: unknown) {
  return reason instanceof ActionValidationError
    ? reason.message
    : "The change could not be saved. Please try again.";
}
export async function generateInvoiceResult(f: FormData): Promise<{
  success: boolean;
  id?: number;
  error?: string;
}> {
  await requireAdmin();
  try {
    return { success: true, id: await generateInvoiceQuick(f) };
  } catch (reason) {
    return { success: false, error: publicMessage(reason) };
  }
}
export async function submitAssignmentResult(f: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  await studentSession();
  try {
    await submitAssignment(f);
    return { success: true };
  } catch (reason) {
    return { success: false, error: publicMessage(reason) };
  }
}
export async function gradeSubmissionResult(
  submissionId: number,
  grade: string,
  feedback: string,
  studentId: number,
  expectedVersion: number,
): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAdmin();
  try {
    await gradeSubmissionAction(
      submissionId,
      grade,
      feedback,
      studentId,
      expectedVersion,
    );
    return { success: true };
  } catch (reason) {
    return { success: false, error: publicMessage(reason) };
  }
}

/** Move within one classroom; preserve the post, work, grades and attachments. */
export async function moveClassworkPost(
  postId: number,
  studentId: number,
  topicId: number | null,
  beforePostId: number | null = null,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  try {
    const sid = id(studentId),
      pid = id(postId),
      destination = topicId === null ? null : id(topicId);
    const didMove = await withTransaction(async (tx) => {
      const current = await ownPost(tx, pid, sid);
      await topicOwner(tx, destination, sid);
      const target = (
        await tx.execute({
          sql: "SELECT id FROM posts WHERE student_id=? AND topic_id IS ? ORDER BY sort_order,id DESC",
          args: [sid, destination],
        })
      ).rows.map((p) => Number(p.id));
      const reordered = target.filter((p) => p !== pid);
      const before = beforePostId === null ? null : id(beforePostId);
      if (before === pid) return false;
      const index =
        before === null ? reordered.length : reordered.indexOf(before);
      if (index < 0)
        throw new ActionValidationError(
          "The destination changed. Reload and try again.",
        );
      reordered.splice(index, 0, pid);
      if (
        current.topic_id === destination &&
        target.every((p, i) => p === reordered[i])
      )
        return false;
      const source =
        current.topic_id === destination
          ? []
          : (
              await tx.execute({
                sql: "SELECT id FROM posts WHERE student_id=? AND topic_id IS ? AND id<>? ORDER BY sort_order,id DESC",
                args: [sid, current.topic_id, pid],
              })
            ).rows.map((p) => Number(p.id));
      await tx.batch([
        {
          sql: "UPDATE posts SET topic_id=?,updated_at=datetime('now') WHERE id=? AND student_id=?",
          args: [destination, pid, sid],
        },
        ...reordered.map((p, position) => ({
          sql: "UPDATE posts SET sort_order=? WHERE id=? AND student_id=?",
          args: [position, p, sid],
        })),
        ...source.map((p, position) => ({
          sql: "UPDATE posts SET sort_order=? WHERE id=? AND student_id=?",
          args: [position, p, sid],
        })),
      ]);
      await studentNotice(
        tx,
        sid,
        "classwork_organized",
        "Classwork updated",
        "Your tutor reorganised your classroom posts.",
        randomUUID(),
        `/portal/student/${sid}/classroom`,
      );
      return true;
    });
    if (didMove) refresh(sid);
    return { success: true };
  } catch (reason) {
    return { success: false, error: publicMessage(reason) };
  }
}
