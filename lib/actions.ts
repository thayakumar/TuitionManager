"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { queryAll, queryOne, execute, getClient, ensureMigrated } from "./db";
import { createAdminSession, destroyAdminSession, createStudentSession, destroyStudentSession } from "./auth";
import type { Attendance, ClassStatus, InvoiceStatus } from "./types";

// ---------- Admin Login ----------

export async function seedAdminCredentials() {
  const existing = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'admin_username'"
  );
  if (!existing) {
    await execute("INSERT OR IGNORE INTO settings(key, value) VALUES ('admin_username', 'admin')");
    await execute("INSERT OR IGNORE INTO settings(key, value) VALUES ('admin_password', 'admin123')");
  }
}

export async function loginAdmin(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  if (!username || !password) return { success: false, error: "Username and password required" };

  await seedAdminCredentials();

  const storedUser = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'admin_username'"
  );
  const storedPass = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'admin_password'"
  );

  if (storedUser?.value !== username || storedPass?.value !== password) {
    return { success: false, error: "Invalid username or password" };
  }

  await createAdminSession();
  return { success: true };
}

export async function logoutAdmin() {
  await destroyAdminSession();
  redirect("/login");
}

// ---------- Student Portal Login ----------

export async function loginStudent(
  formData: FormData
): Promise<{ success: boolean; studentId?: number; error?: string }> {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  if (!username || !password) return { success: false, error: "Username and password required" };

  const student = await queryOne<{ id: number }>(
    "SELECT id FROM students WHERE LOWER(username) = ? AND password = ? AND active = 1",
    [username, password]
  );

  if (!student) return { success: false, error: "Invalid username or password" };

  await createStudentSession(student.id);
  return { success: true, studentId: student.id };
}

export async function logoutStudent() {
  await destroyStudentSession();
  redirect("/portal");
}

// ---------- Students ----------

function generateCredentials(name: string) {
  const firstName = name.split(/\s+/)[0].toLowerCase();
  return { username: firstName, password: `${firstName}123` };
}

export async function createStudent(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const { username, password } = generateCredentials(name);

  const result = await execute(
    `INSERT INTO students(name, subject, grade_level, phone, email, guardian_name, guardian_contact, hourly_rate, notes, username, password, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      name,
      String(formData.get("subject") || "") || null,
      String(formData.get("grade_level") || "") || null,
      String(formData.get("phone") || "") || null,
      String(formData.get("email") || "") || null,
      String(formData.get("guardian_name") || "") || null,
      String(formData.get("guardian_contact") || "") || null,
      Number(formData.get("hourly_rate") || 0),
      String(formData.get("notes") || "") || null,
      username,
      password,
    ]
  );

  revalidatePath("/students");
  redirect(`/students/${result.lastInsertRowid}`);
}

export async function createStudentQuick(formData: FormData): Promise<number> {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const { username, password } = generateCredentials(name);

  const result = await execute(
    `INSERT INTO students(name, subject, grade_level, phone, email, guardian_name, guardian_contact, hourly_rate, notes, username, password, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      name,
      String(formData.get("subject") || "") || null,
      String(formData.get("grade_level") || "") || null,
      String(formData.get("phone") || "") || null,
      String(formData.get("email") || "") || null,
      String(formData.get("guardian_name") || "") || null,
      String(formData.get("guardian_contact") || "") || null,
      Number(formData.get("hourly_rate") || 0),
      String(formData.get("notes") || "") || null,
      username,
      password,
    ]
  );

  revalidatePath("/students");
  revalidatePath("/");
  return Number(result.lastInsertRowid);
}

export async function updateStudent(id: number, formData: FormData) {
  await execute(
    `UPDATE students SET name=?, subject=?, grade_level=?, phone=?, email=?, guardian_name=?, guardian_contact=?, hourly_rate=?, notes=?, active=?
     WHERE id = ?`,
    [
      String(formData.get("name") || "").trim(),
      String(formData.get("subject") || "") || null,
      String(formData.get("grade_level") || "") || null,
      String(formData.get("phone") || "") || null,
      String(formData.get("email") || "") || null,
      String(formData.get("guardian_name") || "") || null,
      String(formData.get("guardian_contact") || "") || null,
      Number(formData.get("hourly_rate") || 0),
      String(formData.get("notes") || "") || null,
      formData.get("active") === "on" ? 1 : 0,
      id,
    ]
  );

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

export async function updateStudentQuick(id: number, formData: FormData) {
  await execute(
    `UPDATE students SET name=?, subject=?, grade_level=?, phone=?, email=?, guardian_name=?, guardian_contact=?, hourly_rate=?, notes=?, active=?
     WHERE id = ?`,
    [
      String(formData.get("name") || "").trim(),
      String(formData.get("subject") || "") || null,
      String(formData.get("grade_level") || "") || null,
      String(formData.get("phone") || "") || null,
      String(formData.get("email") || "") || null,
      String(formData.get("guardian_name") || "") || null,
      String(formData.get("guardian_contact") || "") || null,
      Number(formData.get("hourly_rate") || 0),
      String(formData.get("notes") || "") || null,
      formData.get("active") === "on" ? 1 : 0,
      id,
    ]
  );

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
}

export async function deleteStudent(id: number) {
  await execute("DELETE FROM students WHERE id = ?", [id]);
  revalidatePath("/students");
  redirect("/students");
}

// ---------- Classes ----------

function generateMeetingRoom(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const seg = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `tuitionhub-${seg(3)}-${seg(4)}-${seg(3)}`;
}

export async function createClass(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const scheduled_at = String(formData.get("scheduled_at") || "");
  if (!student_id || !scheduled_at) throw new Error("Student and date required");

  const iso = new Date(scheduled_at).toISOString();
  const is_trial = formData.get("is_trial") === "on" ? 1 : 0;
  const meeting_room = generateMeetingRoom();

  const result = await execute(
    `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, attendance, is_trial, meeting_room)
     VALUES (?, ?, ?, ?, ?, 'scheduled', 'present', ?, ?)`,
    [
      student_id,
      iso,
      Number(formData.get("duration_minutes") || 60),
      String(formData.get("subject") || "") || null,
      String(formData.get("location") || "") || null,
      is_trial,
      meeting_room,
    ]
  );

  revalidatePath("/schedule");
  revalidatePath(`/students/${student_id}`);
  redirect(`/classes/${result.lastInsertRowid}`);
}

export async function createClassQuick(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const scheduled_at = String(formData.get("scheduled_at") || "");
  if (!student_id || !scheduled_at) throw new Error("Student and date required");

  const iso = new Date(scheduled_at).toISOString();
  const is_trial = formData.get("is_trial") === "on" ? 1 : 0;
  const meeting_room = generateMeetingRoom();

  await execute(
    `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, attendance, is_trial, meeting_room)
     VALUES (?, ?, ?, ?, ?, 'scheduled', 'present', ?, ?)`,
    [
      student_id,
      iso,
      Number(formData.get("duration_minutes") || 60),
      String(formData.get("subject") || "") || null,
      String(formData.get("location") || "") || null,
      is_trial,
      meeting_room,
    ]
  );

  revalidatePath("/schedule");
  revalidatePath("/");
  revalidatePath(`/students/${student_id}`);
}

export async function updateClass(id: number, formData: FormData) {
  const scheduled_at = String(formData.get("scheduled_at") || "");
  const iso = new Date(scheduled_at).toISOString();

  await execute(
    `UPDATE classes SET scheduled_at=?, duration_minutes=?, subject=?, location=?, status=?, attendance=? WHERE id=?`,
    [
      iso,
      Number(formData.get("duration_minutes") || 60),
      String(formData.get("subject") || "") || null,
      String(formData.get("location") || "") || null,
      String(formData.get("status") || "scheduled") as ClassStatus,
      (String(formData.get("attendance") || "") as Attendance) || null,
      id,
    ]
  );

  revalidatePath("/schedule");
  revalidatePath(`/classes/${id}`);
  redirect(`/classes/${id}`);
}

export async function markAttendance(id: number, attendance: Attendance) {
  const row = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM classes WHERE id = ?",
    [id]
  );
  await execute(
    `UPDATE classes SET attendance = ?, status = CASE WHEN ? = 'absent' THEN 'canceled' ELSE 'completed' END WHERE id = ?`,
    [attendance, attendance, id]
  );
  revalidatePath(`/classes/${id}`);
  revalidatePath("/schedule");
  if (row) revalidatePath(`/students/${row.student_id}`);
  revalidatePath("/");
}

export async function deleteClass(id: number) {
  const row = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM classes WHERE id = ?",
    [id]
  );
  await execute("DELETE FROM classes WHERE id = ?", [id]);
  revalidatePath("/schedule");
  if (row) revalidatePath(`/students/${row.student_id}`);
  redirect("/schedule");
}

export async function deleteClassQuick(id: number) {
  const row = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM classes WHERE id = ?",
    [id]
  );
  await execute("DELETE FROM classes WHERE id = ?", [id]);
  revalidatePath("/schedule");
  if (row) revalidatePath(`/students/${row.student_id}`);
}

export async function cancelClassQuick(id: number) {
  const row = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM classes WHERE id = ?",
    [id]
  );
  await execute(
    "UPDATE classes SET status = 'canceled', attendance = 'absent' WHERE id = ?",
    [id]
  );
  revalidatePath(`/classes/${id}`);
  revalidatePath("/schedule");
  if (row) revalidatePath(`/students/${row.student_id}`);
  revalidatePath("/");
}

// ---------- Reports ----------

export async function saveReport(class_id: number, formData: FormData) {
  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM reports WHERE class_id = ?",
    [class_id]
  );

  const values = [
    String(formData.get("topics_covered") || "") || null,
    String(formData.get("homework") || "") || null,
    String(formData.get("performance") || "") || null,
    String(formData.get("strengths") || "") || null,
    String(formData.get("areas_to_improve") || "") || null,
    String(formData.get("next_focus") || "") || null,
    formData.get("rating") ? Number(formData.get("rating")) : null,
  ];

  if (existing) {
    await execute(
      `UPDATE reports SET topics_covered=?, homework=?, performance=?, strengths=?, areas_to_improve=?, next_focus=?, rating=?, updated_at=datetime('now') WHERE class_id=?`,
      [...values, class_id]
    );
  } else {
    await execute(
      `INSERT INTO reports(class_id, topics_covered, homework, performance, strengths, areas_to_improve, next_focus, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [class_id, ...values]
    );
  }

  await execute(
    "UPDATE classes SET status = 'completed' WHERE id = ? AND status != 'canceled'",
    [class_id]
  );

  revalidatePath(`/classes/${class_id}`);
}

export async function saveReportQuick(class_id: number, formData: FormData) {
  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM reports WHERE class_id = ?",
    [class_id]
  );

  const values = [
    String(formData.get("topics_covered") || "") || null,
    String(formData.get("homework") || "") || null,
    String(formData.get("performance") || "") || null,
    String(formData.get("strengths") || "") || null,
    String(formData.get("areas_to_improve") || "") || null,
    String(formData.get("next_focus") || "") || null,
    formData.get("rating") ? Number(formData.get("rating")) : null,
  ];

  if (existing) {
    await execute(
      `UPDATE reports SET topics_covered=?, homework=?, performance=?, strengths=?, areas_to_improve=?, next_focus=?, rating=?, updated_at=datetime('now') WHERE class_id=?`,
      [...values, class_id]
    );
  } else {
    await execute(
      `INSERT INTO reports(class_id, topics_covered, homework, performance, strengths, areas_to_improve, next_focus, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [class_id, ...values]
    );
  }

  await execute(
    "UPDATE classes SET status = 'completed' WHERE id = ? AND status != 'canceled'",
    [class_id]
  );

  const cls = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM classes WHERE id = ?",
    [class_id]
  );
  revalidatePath(`/classes/${class_id}`);
  revalidatePath("/schedule");
  if (cls) revalidatePath(`/students/${cls.student_id}`);
  revalidatePath("/");
}

export async function rescheduleClassQuick(
  cancelledClassId: number,
  scheduledAt: string
) {
  const cls = await queryOne<{
    student_id: number;
    duration_minutes: number;
    subject: string | null;
    location: string | null;
  }>(
    "SELECT student_id, duration_minutes, subject, location FROM classes WHERE id = ?",
    [cancelledClassId]
  );
  if (!cls) throw new Error("Class not found");

  const iso = new Date(scheduledAt).toISOString();
  const meeting_room = generateMeetingRoom();
  await execute(
    `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, attendance, meeting_room, rescheduled_from)
     VALUES (?, ?, ?, ?, ?, 'scheduled', 'present', ?, ?)`,
    [
      cls.student_id,
      iso,
      cls.duration_minutes,
      cls.subject ? `[RESCHEDULED] ${cls.subject}` : "[RESCHEDULED] Lesson",
      cls.location,
      meeting_room,
      cancelledClassId,
    ]
  );

  revalidatePath("/schedule");
  revalidatePath(`/students/${cls.student_id}`);
}

// ---------- Invoices ----------

async function nextInvoiceNumber(): Promise<string> {
  const row = await queryOne<{ invoice_number: string }>(
    "SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1"
  );
  const year = new Date().getFullYear();
  if (!row) return `INV-${year}-0001`;
  const m = row.invoice_number.match(/INV-(\d{4})-(\d+)/);
  if (!m || Number(m[1]) !== year) return `INV-${year}-0001`;
  const seq = Number(m[2]) + 1;
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

export async function generateInvoice(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const period_start = String(formData.get("period_start") || "");
  const period_end = String(formData.get("period_end") || "");
  if (!student_id || !period_start || !period_end) {
    throw new Error("Student and period required");
  }

  const startISO = new Date(period_start + "T00:00:00").toISOString();
  const endISO = new Date(period_end + "T23:59:59").toISOString();

  const classes = await queryAll<{
    id: number;
    scheduled_at: string;
    duration_minutes: number;
    subject: string | null;
    status: string;
    is_trial: number;
    hourly_rate: number;
    student_name: string;
  }>(
    `SELECT c.*, s.hourly_rate, s.name AS student_name
     FROM classes c JOIN students s ON s.id = c.student_id
     WHERE c.student_id = ?
       AND c.status IN ('completed', 'canceled')
       AND c.scheduled_at BETWEEN ? AND ?
       AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.class_id = c.id)
     ORDER BY c.scheduled_at`,
    [student_id, startISO, endISO]
  );

  if (classes.length === 0) {
    throw new Error("No un-invoiced classes in this period");
  }

  const invoiceNumber = await nextInvoiceNumber();
  await ensureMigrated();
  const client = getClient();

  const total = classes.reduce((sum, c) => {
    if (c.status === "canceled" || c.is_trial) return sum;
    return sum + (Number(c.duration_minutes) / 60) * Number(c.hourly_rate);
  }, 0);

  const invResult = await client.execute({
    sql: `INSERT INTO invoices(student_id, invoice_number, period_start, period_end, total_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
    args: [
      student_id,
      invoiceNumber,
      startISO,
      endISO,
      total,
      String(formData.get("notes") || "") || null,
    ],
  });

  const invoice_id = Number(invResult.lastInsertRowid);

  for (const c of classes) {
    const isCanceled = c.status === "canceled";
    const isTrial = !!c.is_trial;
    const hours = Number(c.duration_minutes) / 60;
    const amount = (isCanceled || isTrial) ? 0 : hours * Number(c.hourly_rate);
    const prefix = isCanceled ? "[CANCELLED] " : isTrial ? "[TRIAL] " : "";
    const desc = `${prefix}${c.subject || "Lesson"} — ${new Date(c.scheduled_at).toLocaleDateString(
      "en-GB",
      { weekday: "short", day: "numeric", month: "short", year: "numeric" }
    )} (${c.duration_minutes} min)`;
    await client.execute({
      sql: `INSERT INTO invoice_items(invoice_id, class_id, description, quantity, unit_amount, amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
      args: [invoice_id, c.id, desc, hours, (isCanceled || isTrial) ? 0 : Number(c.hourly_rate), amount],
    });
  }

  revalidatePath("/invoices");
  revalidatePath(`/students/${student_id}`);
  redirect(`/invoices/${invoice_id}`);
}

export async function generateInvoiceQuick(formData: FormData): Promise<number> {
  const student_id = Number(formData.get("student_id"));
  const period_start = String(formData.get("period_start") || "");
  const period_end = String(formData.get("period_end") || "");
  if (!student_id || !period_start || !period_end) {
    throw new Error("Student and period required");
  }

  const startISO = new Date(period_start + "T00:00:00").toISOString();
  const endISO = new Date(period_end + "T23:59:59").toISOString();

  const classes = await queryAll<{
    id: number;
    scheduled_at: string;
    duration_minutes: number;
    subject: string | null;
    status: string;
    is_trial: number;
    hourly_rate: number;
    student_name: string;
  }>(
    `SELECT c.*, s.hourly_rate, s.name AS student_name
     FROM classes c JOIN students s ON s.id = c.student_id
     WHERE c.student_id = ?
       AND c.status IN ('completed', 'canceled')
       AND c.scheduled_at BETWEEN ? AND ?
       AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.class_id = c.id)
     ORDER BY c.scheduled_at`,
    [student_id, startISO, endISO]
  );

  if (classes.length === 0) {
    throw new Error("No un-invoiced classes in this period");
  }

  const invoiceNumber = await nextInvoiceNumber();
  await ensureMigrated();
  const client = getClient();

  const total = classes.reduce((sum, c) => {
    if (c.status === "canceled" || c.is_trial) return sum;
    return sum + (Number(c.duration_minutes) / 60) * Number(c.hourly_rate);
  }, 0);

  const invResult = await client.execute({
    sql: `INSERT INTO invoices(student_id, invoice_number, period_start, period_end, total_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
    args: [
      student_id,
      invoiceNumber,
      startISO,
      endISO,
      total,
      String(formData.get("notes") || "") || null,
    ],
  });

  const invoice_id = Number(invResult.lastInsertRowid);

  for (const c of classes) {
    const isCanceled = c.status === "canceled";
    const isTrial = !!c.is_trial;
    const hours = Number(c.duration_minutes) / 60;
    const amount = (isCanceled || isTrial) ? 0 : hours * Number(c.hourly_rate);
    const prefix = isCanceled ? "[CANCELLED] " : isTrial ? "[TRIAL] " : "";
    const desc = `${prefix}${c.subject || "Lesson"} — ${new Date(c.scheduled_at).toLocaleDateString(
      "en-GB",
      { weekday: "short", day: "numeric", month: "short", year: "numeric" }
    )} (${c.duration_minutes} min)`;
    await client.execute({
      sql: `INSERT INTO invoice_items(invoice_id, class_id, description, quantity, unit_amount, amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
      args: [invoice_id, c.id, desc, hours, (isCanceled || isTrial) ? 0 : Number(c.hourly_rate), amount],
    });
  }

  revalidatePath("/invoices");
  revalidatePath(`/students/${student_id}`);
  return invoice_id;
}

export async function setInvoiceStatus(id: number, status: InvoiceStatus) {
  const paid_at = status === "paid" ? new Date().toISOString() : null;
  await execute("UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?", [
    status,
    paid_at,
    id,
  ]);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoice(id: number) {
  await execute("DELETE FROM invoices WHERE id = ?", [id]);
  revalidatePath("/invoices");
  redirect("/invoices");
}

// ---------- Cancel / Reschedule (Phase 3) ----------

export async function cancelClass(id: number, formData: FormData) {
  const reason = String(formData.get("cancel_reason") || "") || null;
  const rescheduleDate = String(formData.get("reschedule_date") || "");
  const cls = await queryOne<{ student_id: number; duration_minutes: number; subject: string | null; location: string | null }>(
    "SELECT student_id, duration_minutes, subject, location FROM classes WHERE id = ?",
    [id]
  );
  if (!cls) throw new Error("Class not found");

  await execute(
    "UPDATE classes SET status = 'canceled', attendance = 'absent', cancel_reason = ? WHERE id = ?",
    [reason, id]
  );

  if (rescheduleDate) {
    const iso = new Date(rescheduleDate).toISOString();
    await execute(
      `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, attendance, rescheduled_from)
       VALUES (?, ?, ?, ?, ?, 'scheduled', 'present', ?)`,
      [cls.student_id, iso, cls.duration_minutes, cls.subject ? `[RESCHEDULED] ${cls.subject}` : "[RESCHEDULED] Lesson", cls.location, id]
    );
  }

  revalidatePath("/schedule");
  revalidatePath(`/classes/${id}`);
  revalidatePath(`/students/${cls.student_id}`);
  redirect(`/classes/${id}`);
}

// ---------- Recurring Scheduling (Phase 4) ----------

export async function createRecurrence(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const daysRaw = formData.getAll("day_of_week");
  const time = String(formData.get("time") || "");
  const duration = Number(formData.get("duration_minutes") || 60);
  const subject = String(formData.get("subject") || "") || null;
  const location = String(formData.get("location") || "") || null;
  const frequency = String(formData.get("frequency") || "weekly");
  const customInterval = formData.get("custom_interval_days") ? Number(formData.get("custom_interval_days")) : null;
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "") || null;

  if (!student_id || daysRaw.length === 0 || !time || !startDate) {
    throw new Error("Student, day(s), time, and start date are required");
  }

  const holidays = await queryAll<{ date: string }>("SELECT date FROM holidays");
  const holidaySet = new Set(holidays.map((h) => h.date));

  for (const dayStr of daysRaw) {
    const dayOfWeek = Number(dayStr);
    const result = await execute(
      `INSERT INTO recurrences(student_id, day_of_week, time, duration_minutes, subject, location, frequency, custom_interval_days, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, dayOfWeek, time, duration, subject, location, frequency, customInterval, startDate, endDate]
    );
    const recurrenceId = Number(result.lastInsertRowid);
    await generateClassesForRecurrence(recurrenceId, holidaySet);
  }

  revalidatePath("/schedule");
  revalidatePath(`/students/${student_id}`);
  redirect("/schedule");
}

export async function createRecurrenceQuick(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const daysRaw = formData.getAll("day_of_week");
  const time = String(formData.get("time") || "");
  const duration = Number(formData.get("duration_minutes") || 60);
  const subject = String(formData.get("subject") || "") || null;
  const location = String(formData.get("location") || "") || null;
  const frequency = String(formData.get("frequency") || "weekly");
  const customInterval = formData.get("custom_interval_days") ? Number(formData.get("custom_interval_days")) : null;
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "") || null;

  if (!student_id || daysRaw.length === 0 || !time || !startDate) {
    throw new Error("Student, day(s), time, and start date are required");
  }

  const holidays = await queryAll<{ date: string }>("SELECT date FROM holidays");
  const holidaySet = new Set(holidays.map((h) => h.date));

  for (const dayStr of daysRaw) {
    const dayOfWeek = Number(dayStr);
    const result = await execute(
      `INSERT INTO recurrences(student_id, day_of_week, time, duration_minutes, subject, location, frequency, custom_interval_days, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, dayOfWeek, time, duration, subject, location, frequency, customInterval, startDate, endDate]
    );
    const recurrenceId = Number(result.lastInsertRowid);
    await generateClassesForRecurrence(recurrenceId, holidaySet);
  }

  revalidatePath("/schedule");
  revalidatePath(`/students/${student_id}`);
}

async function generateClassesForRecurrence(recurrenceId: number, holidaySet: Set<string>) {
  const rec = await queryOne<{
    student_id: number; day_of_week: number; time: string; duration_minutes: number;
    subject: string | null; location: string | null; frequency: string;
    custom_interval_days: number | null; start_date: string; end_date: string | null;
  }>("SELECT * FROM recurrences WHERE id = ?", [recurrenceId]);
  if (!rec) return;

  const start = new Date(rec.start_date + "T00:00:00");
  const end = rec.end_date ? new Date(rec.end_date + "T23:59:59") : new Date(start.getTime() + 56 * 24 * 60 * 60 * 1000);
  const [hours, minutes] = rec.time.split(":").map(Number);

  const cursor = new Date(start);
  while (cursor.getDay() !== rec.day_of_week) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const step = rec.frequency === "biweekly" ? 14 : rec.frequency === "custom" && rec.custom_interval_days ? rec.custom_interval_days : 7;

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (!holidaySet.has(dateStr)) {
      const classDate = new Date(cursor);
      classDate.setHours(hours, minutes, 0, 0);
      await execute(
        `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, attendance, recurrence_id)
         VALUES (?, ?, ?, ?, ?, 'scheduled', 'present', ?)`,
        [rec.student_id, classDate.toISOString(), rec.duration_minutes, rec.subject, rec.location, recurrenceId]
      );
    }
    cursor.setDate(cursor.getDate() + step);
  }
}

export async function deleteRecurrence(id: number) {
  const rec = await queryOne<{ student_id: number }>("SELECT student_id FROM recurrences WHERE id = ?", [id]);
  await execute("DELETE FROM classes WHERE recurrence_id = ? AND status = 'scheduled'", [id]);
  await execute("DELETE FROM recurrences WHERE id = ?", [id]);
  revalidatePath("/schedule");
  if (rec) revalidatePath(`/students/${rec.student_id}`);
  redirect("/schedule");
}

// ---------- Holidays (Phase 5) ----------

export async function addHoliday(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const date = String(formData.get("date") || "");
  if (!name || !date) throw new Error("Name and date required");
  await execute("INSERT OR IGNORE INTO holidays(name, date) VALUES (?, ?)", [name, date]);
  revalidatePath("/settings");
}

export async function deleteHoliday(id: number) {
  await execute("DELETE FROM holidays WHERE id = ?", [id]);
  revalidatePath("/settings");
}

// ---------- Student Notes (Phase 11) ----------

export async function addStudentNote(studentId: number, formData: FormData) {
  const content = String(formData.get("content") || "").trim();
  if (!content) throw new Error("Note content required");
  await execute("INSERT INTO student_notes(student_id, content) VALUES (?, ?)", [studentId, content]);
  revalidatePath(`/students/${studentId}`);
}

export async function deleteStudentNote(noteId: number, studentId: number) {
  await execute("DELETE FROM student_notes WHERE id = ?", [noteId]);
  revalidatePath(`/students/${studentId}`);
}

// ---------- Share Tokens (Phase 13) ----------

export async function generateShareToken(studentId: number) {
  const token = crypto.randomUUID();
  await execute("UPDATE share_tokens SET active = 0 WHERE student_id = ?", [studentId]);
  await execute("INSERT INTO share_tokens(student_id, token) VALUES (?, ?)", [studentId, token]);
  revalidatePath(`/students/${studentId}`);
  return token;
}

export async function revokeShareToken(studentId: number) {
  await execute("UPDATE share_tokens SET active = 0 WHERE student_id = ?", [studentId]);
  revalidatePath(`/students/${studentId}`);
}

// ---------- Settings ----------

export async function saveSettings(formData: FormData) {
  const keys = ["business_name", "business_contact", "currency", "payment_instructions"];
  for (const k of keys) {
    await execute(
      "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [k, String(formData.get(k) || "")]
    );
  }
  revalidatePath("/settings");
  redirect("/settings");
}

export async function saveDuitNowQR(formData: FormData) {
  const file = formData.get("qr_image") as File | null;
  if (!file || file.size === 0) return;
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;
  await execute(
    "INSERT INTO settings(key, value) VALUES('duitnow_qr', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [dataUrl]
  );
  revalidatePath("/settings");
  revalidatePath("/invoices");
}

export async function removeDuitNowQR() {
  await execute("DELETE FROM settings WHERE key = 'duitnow_qr'");
  revalidatePath("/settings");
}

// ---------- Classroom / Posts ----------

export async function createPost(formData: FormData) {
  const type = String(formData.get("type") || "material");
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title is required");

  const student_id = formData.get("student_id") ? Number(formData.get("student_id")) : null;
  const due_at = String(formData.get("due_at") || "") || null;
  const body = String(formData.get("body") || "") || null;

  const result = await execute(
    `INSERT INTO posts(type, title, body, student_id, due_at) VALUES (?, ?, ?, ?, ?)`,
    [type, title, body, student_id, due_at ? new Date(due_at).toISOString() : null]
  );

  const postId = Number(result.lastInsertRowid);

  if (type === "quiz") {
    const questionsJson = String(formData.get("questions") || "[]");
    try {
      const questions = JSON.parse(questionsJson) as Array<{
        question: string; type: string; options?: string; correct_answer?: string; points?: number;
      }>;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await execute(
          `INSERT INTO quiz_questions(post_id, question, type, options, correct_answer, points, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [postId, q.question, q.type || "mcq", q.options || null, q.correct_answer || null, q.points || 1, i]
        );
      }
    } catch {
      // Invalid JSON, skip questions
    }
  }

  revalidatePath("/classroom");
  if (student_id) {
    revalidatePath(`/classroom/${student_id}`);
    revalidatePath(`/portal`);
  }
  redirect(student_id ? `/classroom/${student_id}` : "/classroom");
}

export async function createPostAction(
  studentId: number,
  type: string,
  title: string,
  body: string,
  dueAt: string | null,
  topicId: number | null = null,
  maxPoints: number | null = null
): Promise<{ success: boolean; error?: string }> {
  if (!title.trim()) return { success: false, error: "Title is required" };
  await execute(
    `INSERT INTO posts(type, title, body, student_id, due_at, topic_id, max_points) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [type, title.trim(), body.trim() || null, studentId, dueAt ? new Date(dueAt).toISOString() : null, topicId, maxPoints]
  );
  revalidatePath("/classroom");
  revalidatePath(`/classroom/${studentId}`);
  revalidatePath("/portal");
  return { success: true };
}

export async function deletePostAction(
  postId: number,
  studentId: number
): Promise<{ success: boolean }> {
  await execute("DELETE FROM posts WHERE id = ?", [postId]);
  revalidatePath("/classroom");
  revalidatePath(`/classroom/${studentId}`);
  revalidatePath("/portal");
  return { success: true };
}

export async function updatePost(formData: FormData) {
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title is required");

  const body = String(formData.get("body") || "") || null;
  const due_at = String(formData.get("due_at") || "") || null;
  const topic_id = formData.get("topic_id") ? Number(formData.get("topic_id")) : null;
  const max_points = formData.get("max_points") ? Number(formData.get("max_points")) : null;

  await execute(
    "UPDATE posts SET title = ?, body = ?, due_at = ?, topic_id = ?, max_points = ?, updated_at = datetime('now') WHERE id = ?",
    [title, body, due_at ? new Date(due_at).toISOString() : null, topic_id, max_points, id]
  );

  const post = await queryOne<{ student_id: number | null }>("SELECT student_id FROM posts WHERE id = ?", [id]);
  revalidatePath("/classroom");
  if (post?.student_id) {
    revalidatePath(`/classroom/${post.student_id}`);
    revalidatePath("/portal");
  }
}

export async function deletePost(id: number, studentId?: number) {
  await execute("DELETE FROM posts WHERE id = ?", [id]);
  revalidatePath("/classroom");
  if (studentId) {
    revalidatePath(`/classroom/${studentId}`);
    revalidatePath("/portal");
  }
}

export async function submitAssignment(formData: FormData) {
  const post_id = Number(formData.get("post_id"));
  const student_id = Number(formData.get("student_id"));
  const content = String(formData.get("content") || "") || null;
  const file_url = String(formData.get("file_url") || "") || null;

  await execute(
    `INSERT INTO submissions(post_id, student_id, content, file_url) VALUES (?, ?, ?, ?)`,
    [post_id, student_id, content, file_url]
  );

  revalidatePath("/classroom");
  revalidatePath("/portal");
}

export async function gradeSubmission(id: number, formData: FormData) {
  const grade = String(formData.get("grade") || "");
  const feedback = String(formData.get("feedback") || "") || null;

  await execute(
    `UPDATE submissions SET grade = ?, feedback = ?, graded_at = datetime('now') WHERE id = ?`,
    [grade, feedback, id]
  );

  revalidatePath("/classroom");
}

export async function submitQuizAnswers(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const post_id = Number(formData.get("post_id"));

  const questions = await queryAll<{ id: number; correct_answer: string | null; type: string }>(
    "SELECT id, correct_answer, type FROM quiz_questions WHERE post_id = ? ORDER BY sort_order",
    [post_id]
  );

  for (const q of questions) {
    const answer = String(formData.get(`answer_${q.id}`) || "");
    if (!answer) continue;
    const is_correct = q.type === "mcq" && q.correct_answer
      ? (answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase() ? 1 : 0)
      : null;
    await execute(
      `INSERT INTO quiz_answers(question_id, student_id, answer, is_correct) VALUES (?, ?, ?, ?)`,
      [q.id, student_id, answer, is_correct]
    );
  }

  revalidatePath("/portal");
}

// ---------- Topics ----------

export async function createTopic(studentId: number, name: string): Promise<{ success: boolean; id?: number }> {
  if (!name.trim()) return { success: false };
  const maxOrder = await queryOne<{ m: number }>("SELECT COALESCE(MAX(sort_order), -1) as m FROM topics WHERE student_id = ?", [studentId]);
  const result = await execute(
    "INSERT INTO topics(student_id, name, sort_order) VALUES (?, ?, ?)",
    [studentId, name.trim(), (maxOrder?.m ?? -1) + 1]
  );
  revalidatePath("/classroom");
  revalidatePath(`/classroom/${studentId}`);
  return { success: true, id: Number(result.lastInsertRowid) };
}

export async function renameTopic(topicId: number, name: string, studentId: number): Promise<{ success: boolean }> {
  if (!name.trim()) return { success: false };
  await execute("UPDATE topics SET name = ? WHERE id = ?", [name.trim(), topicId]);
  revalidatePath("/classroom");
  revalidatePath(`/classroom/${studentId}`);
  return { success: true };
}

export async function deleteTopic(topicId: number, studentId: number): Promise<{ success: boolean }> {
  await execute("DELETE FROM topics WHERE id = ?", [topicId]);
  revalidatePath("/classroom");
  revalidatePath(`/classroom/${studentId}`);
  return { success: true };
}

// ---------- Grading ----------

export async function gradeSubmissionAction(
  submissionId: number,
  grade: string,
  feedback: string,
  studentId: number
): Promise<{ success: boolean }> {
  await execute(
    "UPDATE submissions SET grade = ?, feedback = ?, graded_at = datetime('now') WHERE id = ?",
    [grade, feedback || null, submissionId]
  );
  revalidatePath("/classroom");
  revalidatePath(`/classroom/${studentId}`);
  revalidatePath(`/portal/student/${studentId}/classroom`);
  return { success: true };
}

// ---------- Post Attachments ----------

export async function addPostAttachment(
  postId: number,
  fileName: string,
  fileUrl: string,
  fileType: string | null,
  studentId: number
): Promise<{ success: boolean }> {
  await execute(
    "INSERT INTO post_attachments(post_id, file_name, file_url, file_type) VALUES (?, ?, ?, ?)",
    [postId, fileName, fileUrl, fileType]
  );
  revalidatePath(`/classroom/${studentId}`);
  return { success: true };
}

export async function deletePostAttachment(attachmentId: number, studentId: number): Promise<{ success: boolean }> {
  await execute("DELETE FROM post_attachments WHERE id = ?", [attachmentId]);
  revalidatePath(`/classroom/${studentId}`);
  return { success: true };
}

// ---------- Meeting Notes ----------

export async function saveMeetingNotes(classId: number, notes: string) {
  await execute("UPDATE classes SET meeting_notes = ? WHERE id = ?", [notes, classId]);
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/schedule");
}
