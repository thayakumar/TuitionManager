"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { Attendance, ClassStatus, InvoiceStatus } from "./types";

// ---------- Students ----------

export async function createStudent(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const info = db()
    .prepare(
      `INSERT INTO students(name, subject, grade_level, phone, email, guardian_name, guardian_contact, hourly_rate, notes, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(
      name,
      String(formData.get("subject") || "") || null,
      String(formData.get("grade_level") || "") || null,
      String(formData.get("phone") || "") || null,
      String(formData.get("email") || "") || null,
      String(formData.get("guardian_name") || "") || null,
      String(formData.get("guardian_contact") || "") || null,
      Number(formData.get("hourly_rate") || 0),
      String(formData.get("notes") || "") || null
    );

  revalidatePath("/students");
  redirect(`/students/${info.lastInsertRowid}`);
}

export async function updateStudent(id: number, formData: FormData) {
  db()
    .prepare(
      `UPDATE students SET name=?, subject=?, grade_level=?, phone=?, email=?, guardian_name=?, guardian_contact=?, hourly_rate=?, notes=?, active=?
       WHERE id = ?`
    )
    .run(
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
      id
    );

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

export async function deleteStudent(id: number) {
  db().prepare("DELETE FROM students WHERE id = ?").run(id);
  revalidatePath("/students");
  redirect("/students");
}

// ---------- Classes ----------

export async function createClass(formData: FormData) {
  const student_id = Number(formData.get("student_id"));
  const scheduled_at = String(formData.get("scheduled_at") || "");
  if (!student_id || !scheduled_at) throw new Error("Student and date required");

  const iso = new Date(scheduled_at).toISOString();

  const info = db()
    .prepare(
      `INSERT INTO classes(student_id, scheduled_at, duration_minutes, subject, location, status)
       VALUES (?, ?, ?, ?, ?, 'scheduled')`
    )
    .run(
      student_id,
      iso,
      Number(formData.get("duration_minutes") || 60),
      String(formData.get("subject") || "") || null,
      String(formData.get("location") || "") || null
    );

  revalidatePath("/schedule");
  revalidatePath(`/students/${student_id}`);
  redirect(`/classes/${info.lastInsertRowid}`);
}

export async function updateClass(id: number, formData: FormData) {
  const scheduled_at = String(formData.get("scheduled_at") || "");
  const iso = new Date(scheduled_at).toISOString();

  db()
    .prepare(
      `UPDATE classes SET scheduled_at=?, duration_minutes=?, subject=?, location=?, status=?, attendance=? WHERE id=?`
    )
    .run(
      iso,
      Number(formData.get("duration_minutes") || 60),
      String(formData.get("subject") || "") || null,
      String(formData.get("location") || "") || null,
      (String(formData.get("status") || "scheduled") as ClassStatus),
      (String(formData.get("attendance") || "") as Attendance) || null,
      id
    );

  revalidatePath("/schedule");
  revalidatePath(`/classes/${id}`);
  redirect(`/classes/${id}`);
}

export async function markAttendance(id: number, attendance: Attendance) {
  db()
    .prepare(
      `UPDATE classes SET attendance = ?, status = CASE WHEN ? = 'absent' THEN 'canceled' ELSE 'completed' END WHERE id = ?`
    )
    .run(attendance, attendance, id);
  revalidatePath(`/classes/${id}`);
  revalidatePath("/schedule");
}

export async function deleteClass(id: number) {
  const row = db()
    .prepare("SELECT student_id FROM classes WHERE id = ?")
    .get(id) as { student_id: number } | undefined;
  db().prepare("DELETE FROM classes WHERE id = ?").run(id);
  revalidatePath("/schedule");
  if (row) revalidatePath(`/students/${row.student_id}`);
  redirect("/schedule");
}

// ---------- Reports ----------

export async function saveReport(class_id: number, formData: FormData) {
  const existing = db()
    .prepare("SELECT id FROM reports WHERE class_id = ?")
    .get(class_id) as { id: number } | undefined;

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
    db()
      .prepare(
        `UPDATE reports SET topics_covered=?, homework=?, performance=?, strengths=?, areas_to_improve=?, next_focus=?, rating=?, updated_at=datetime('now') WHERE class_id=?`
      )
      .run(...values, class_id);
  } else {
    db()
      .prepare(
        `INSERT INTO reports(class_id, topics_covered, homework, performance, strengths, areas_to_improve, next_focus, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(class_id, ...values);
  }

  db()
    .prepare("UPDATE classes SET status = 'completed' WHERE id = ? AND status != 'canceled'")
    .run(class_id);

  revalidatePath(`/classes/${class_id}`);
}

// ---------- Invoices ----------

function nextInvoiceNumber(): string {
  const row = db()
    .prepare("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1")
    .get() as { invoice_number: string } | undefined;
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

  const classes = db()
    .prepare(
      `SELECT c.*, s.hourly_rate, s.name AS student_name
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.student_id = ?
         AND c.status = 'completed'
         AND c.scheduled_at BETWEEN ? AND ?
         AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.class_id = c.id)
       ORDER BY c.scheduled_at`
    )
    .all(student_id, startISO, endISO) as Array<{
    id: number;
    scheduled_at: string;
    duration_minutes: number;
    subject: string | null;
    hourly_rate: number;
    student_name: string;
  }>;

  if (classes.length === 0) {
    throw new Error("No un-invoiced completed classes in this period");
  }

  const invoiceNumber = nextInvoiceNumber();

  const tx = db().transaction(() => {
    const total = classes.reduce(
      (sum, c) => sum + (c.duration_minutes / 60) * c.hourly_rate,
      0
    );

    const info = db()
      .prepare(
        `INSERT INTO invoices(student_id, invoice_number, period_start, period_end, total_amount, status, notes)
         VALUES (?, ?, ?, ?, ?, 'draft', ?)`
      )
      .run(student_id, invoiceNumber, startISO, endISO, total, String(formData.get("notes") || "") || null);

    const invoice_id = Number(info.lastInsertRowid);

    const itemStmt = db().prepare(
      `INSERT INTO invoice_items(invoice_id, class_id, description, quantity, unit_amount, amount)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const c of classes) {
      const hours = c.duration_minutes / 60;
      const amount = hours * c.hourly_rate;
      const desc = `${c.subject || "Lesson"} — ${new Date(c.scheduled_at).toLocaleDateString(
        "en-GB",
        { weekday: "short", day: "numeric", month: "short", year: "numeric" }
      )} (${c.duration_minutes} min)`;
      itemStmt.run(invoice_id, c.id, desc, hours, c.hourly_rate, amount);
    }

    return invoice_id;
  });

  const invoice_id = tx();

  revalidatePath("/invoices");
  revalidatePath(`/students/${student_id}`);
  redirect(`/invoices/${invoice_id}`);
}

export async function setInvoiceStatus(id: number, status: InvoiceStatus) {
  const paid_at = status === "paid" ? new Date().toISOString() : null;
  db()
    .prepare("UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?")
    .run(status, paid_at, id);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoice(id: number) {
  db().prepare("DELETE FROM invoices WHERE id = ?").run(id);
  revalidatePath("/invoices");
  redirect("/invoices");
}

// ---------- Settings ----------

export async function saveSettings(formData: FormData) {
  const keys = ["business_name", "business_contact", "currency", "payment_instructions"];
  const set = db().prepare(
    "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  for (const k of keys) set.run(k, String(formData.get(k) || ""));
  revalidatePath("/settings");
  redirect("/settings");
}
