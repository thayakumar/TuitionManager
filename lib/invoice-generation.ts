import { randomUUID } from "crypto";
import type { Transaction } from "@libsql/client";
import { monthBounds } from "./domain/business-time";

export type BillableLesson = {
  id: number;
  scheduled_at: string;
  duration_minutes: number;
  is_trial: number;
  hourly_rate: number;
};

export async function unclaimedLessons(
  tx: Transaction,
  studentId: number,
  start: string,
  end: string,
): Promise<BillableLesson[]> {
  return (await tx.execute({
    sql: `SELECT c.id,c.scheduled_at,c.duration_minutes,c.is_trial,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE c.student_id=? AND c.status='completed' AND c.attendance IN ('present','late') AND julianday(c.scheduled_at)>=julianday(?) AND julianday(c.scheduled_at)<julianday(?) AND NOT EXISTS(SELECT 1 FROM invoice_items ii WHERE ii.class_id=c.id) ORDER BY julianday(c.scheduled_at)`,
    args: [studentId, start, end],
  })).rows as unknown as BillableLesson[];
}

/** Caller holds the write transaction covering selection and lesson claims. */
export async function createDraftInvoice(
  tx: Transaction,
  studentId: number,
  month: string,
  classes: BillableLesson[],
  notes: string | null,
): Promise<number> {
  const [start, end] = monthBounds(month);
  const items = classes.map((c) => ({
    c,
    amount: c.is_trial ? 0 : Math.round(Number(c.duration_minutes) * Math.round(Number(c.hourly_rate) * 100) / 60) / 100,
  }));
  const total = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const result = await tx.execute({
    sql: "INSERT INTO invoices(student_id,invoice_number,period_start,period_end,total_amount,status,notes,billing_month) VALUES(?,?,?,?,?,'draft',?,?)",
    args: [studentId, `INV-${month.replace("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`, start, new Date(Date.parse(end) - 1).toISOString(), total, notes, month],
  });
  const invoiceId = Number(result.lastInsertRowid);
  if (items.length) await tx.batch(items.map(({ c, amount }) => ({
    sql: "INSERT INTO invoice_items(invoice_id,class_id,description,quantity,unit_amount,amount) VALUES(?,?,?,?,?,?)",
    args: [invoiceId, c.id, `${c.is_trial ? "[TRIAL] " : ""}${new Date(String(c.scheduled_at)).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" })} (${c.duration_minutes} min)`, Number(c.duration_minutes) / 60, c.is_trial ? 0 : Number(c.hourly_rate), amount],
  })));
  return invoiceId;
}
