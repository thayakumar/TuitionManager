"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { queryAll, queryOne, execute, getClient, ensureMigrated } from "./db";
import type { Attendance, ClassStatus, InvoiceStatus } from "./types";

// ---------- Students ----------

export async function createStudent(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const result = await execute(
    `INSERT INTO students(name, subject, grade_level, phone, email, guardian_name, guardian_contact, hourly_rate, notes, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
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
    ]
  );

  revalidatePath("/students");
  redirect(`/students/${result.lastInsertRowid}`);
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

export async function deleteStudent(id: number) {
  await execute("DELETE FROM students WHERE id = ?", [id]);
  revalidatePath("/students");
  redirect("/students");
}

// ---------- Classes ----------

export async function createClass(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const scheduled_at = String(formData.get("scheduled_at") || "");
  if (!student_id || !scheduled_at) throw new Error("Student and date required");

  const iso = new Date(scheduled_at).toISOString();

  const is_trial = formData.get("is_trial") === "on" ? 1 : 0;

  const result = await execute(
    `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, is_trial)
     VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
    [
      student_id,
      iso,
      Number(formData.get("duration_minutes") || 60),
      String(formData.get("subject") || "") || null,
      String(formData.get("location") || "") || null,
      is_trial,
    ]
  );

  revalidatePath("/schedule");
  revalidatePath(`/students/${student_id}`);
  redirect(`/classes/${result.lastInsertRowid}`);
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
  await execute(
    `UPDATE classes SET attendance = ?, status = CASE WHEN ? = 'absent' THEN 'canceled' ELSE 'completed' END WHERE id = ?`,
    [attendance, attendance, id]
  );
  revalidatePath(`/classes/${id}`);
  revalidatePath("/schedule");
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
      `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, rescheduled_from)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
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
        `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status, recurrence_id)
         VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
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
