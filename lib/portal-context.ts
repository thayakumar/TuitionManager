import type { Attendance, LegacyAttendance } from "@/lib/types";
import { notFound, redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export type PortalStudent = {
  id: number;
  name: string;
  subject: string | null;
  grade_level: string | null;
  phone: string | null;
  email: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  username: string | null;
  active: number;
  created_at: string;
};
const STUDENT_COLUMNS =
  "s.id,s.name,s.subject,s.grade_level,s.phone,s.email,s.guardian_name,s.guardian_contact,s.username,s.active,s.created_at";

/** Authorize before any child route reads student data, independently of its layout. */
export async function ownStudentContext(
  studentId: number,
): Promise<PortalStudent> {
  if (
    !Number.isSafeInteger(studentId) ||
    studentId < 1 ||
    (await getStudentSession()) !== studentId
  )
    redirect("/portal/student");
  const student = await queryOne<PortalStudent>(
    `SELECT ${STUDENT_COLUMNS} FROM students s WHERE s.id=? AND s.active=1`,
    [studentId],
  );
  if (!student) redirect("/portal/student");
  return student;
}

/** A parent token is a scoped bearer credential; every read route validates it. */
export async function requireParent(token: string): Promise<PortalStudent> {
  if (!token || token.length > 512) notFound();
  const student = await queryOne<PortalStudent>(
    `SELECT ${STUDENT_COLUMNS} FROM share_tokens t JOIN students s ON s.id=t.student_id WHERE t.token=? AND t.active=1`,
    [token],
  );
  if (!student) notFound();
  return student;
}

export const PUBLIC_LESSON_COLUMNS =
  "id,student_id,scheduled_at,duration_minutes,subject,location,status,attendance,recurrence_id,is_trial,cancel_reason,rescheduled_from,meeting_room,created_at";
export const PUBLIC_INVOICE_COLUMNS =
  "id,student_id,invoice_number,period_start,period_end,total_amount,status,issued_at,paid_at,notes,billing_month";
export function attendanceSummary(
  present: number | null,
  absent: number | null,
) {
  const attended = Number(present) || 0,
    missed = Number(absent) || 0;
  return {
    present: attended,
    absent: missed,
    marked: attended + missed,
    rate:
      attended + missed
        ? Math.round((100 * attended) / (attended + missed))
        : 0,
  };
}

/** Display billing month as calendar dates, not UTC end instants. */
export function invoiceCalendarPeriod(invoice: {
  period_start: string;
  billing_month?: string | null;
}) {
  const fallback = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(invoice.period_start));
  const month = /^\d{4}-\d{2}$/.test(invoice.billing_month ?? "")
    ? invoice.billing_month!
    : fallback;
  const [year, number] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return {
    start: `${month}-01T00:00:00+08:00`,
    end: `${month}-${last}T00:00:00+08:00`,
  };
}

/** Read compatibility only: legacy Late rows are attended; no new Late writes are accepted. */
export function normalizedAttendance(value: LegacyAttendance): Attendance {
  return value === "late" ? "present" : value;
}
