"use server";

import { queryAll } from "./db";
import { verifyAdminSession } from "./auth";

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

export async function exportStudentsCsv(): Promise<string> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) throw new Error("Unauthorized");
  const students = await queryAll<Record<string, unknown>>(
    "SELECT name, subject, grade_level, phone, email, guardian_name, guardian_contact, hourly_rate, active, created_at FROM students ORDER BY name"
  );
  const headers = ["Name", "Subject", "Grade", "Phone", "Email", "Guardian", "Guardian Contact", "Rate", "Active", "Created"];
  const rows = students.map((s) => [
    String(s.name ?? ""), String(s.subject ?? ""), String(s.grade_level ?? ""),
    String(s.phone ?? ""), String(s.email ?? ""), String(s.guardian_name ?? ""),
    String(s.guardian_contact ?? ""), String(s.hourly_rate ?? 0), s.active ? "Yes" : "No",
    String(s.created_at ?? ""),
  ]);
  return toCsv(headers, rows);
}

export async function exportClassesCsv(): Promise<string> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) throw new Error("Unauthorized");
  const classes = await queryAll<Record<string, unknown>>(
    `SELECT s.name AS student_name, c.scheduled_at, c.duration_minutes, c.subject, c.location, c.status, c.attendance
     FROM classes c JOIN students s ON s.id = c.student_id ORDER BY c.scheduled_at DESC`
  );
  const headers = ["Student", "Date", "Duration (min)", "Subject", "Location", "Status", "Attendance"];
  const rows = classes.map((c) => [
    String(c.student_name ?? ""), String(c.scheduled_at ?? ""), String(c.duration_minutes ?? ""),
    String(c.subject ?? ""), String(c.location ?? ""), String(c.status ?? ""), String(c.attendance ?? ""),
  ]);
  return toCsv(headers, rows);
}

export async function exportInvoicesCsv(): Promise<string> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) throw new Error("Unauthorized");
  const invoices = await queryAll<Record<string, unknown>>(
    `SELECT i.invoice_number, s.name AS student_name, i.period_start, i.period_end, i.total_amount, i.status, i.issued_at, i.paid_at
     FROM invoices i JOIN students s ON s.id = i.student_id ORDER BY i.issued_at DESC`
  );
  const headers = ["Invoice #", "Student", "Period Start", "Period End", "Total", "Status", "Issued", "Paid"];
  const rows = invoices.map((i) => [
    String(i.invoice_number ?? ""), String(i.student_name ?? ""), String(i.period_start ?? ""),
    String(i.period_end ?? ""), String(i.total_amount ?? 0), String(i.status ?? ""),
    String(i.issued_at ?? ""), String(i.paid_at ?? ""),
  ]);
  return toCsv(headers, rows);
}
