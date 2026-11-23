import { randomUUID } from "crypto";
import type { Transaction } from "@libsql/client";
import { billingMonth, businessDate, businessDateTime, monthBounds, nextDate } from "./domain/business-time";
import { ActionValidationError } from "./action-errors";
import { withTransaction } from "./db";

type InvoiceEligibleLesson = {
  id: number;
  student_id: number;
  scheduled_at: string;
  duration_minutes: number;
  is_trial: number;
  hourly_rate: number;
};

// One eligibility rule for both entry policies; inactive students retain history.
async function unclaimedLessons(
  tx: Transaction, start: string, end: string, studentId?: number,
): Promise<InvoiceEligibleLesson[]> {
  return (await tx.execute({
    sql: `SELECT c.id,c.student_id,strftime('%Y-%m-%dT%H:%M:%fZ',c.scheduled_at) AS scheduled_at,c.duration_minutes,c.is_trial,s.hourly_rate FROM classes c JOIN students s ON s.id=c.student_id WHERE c.status='completed' AND c.attendance IN ('present','late') AND julianday(c.scheduled_at)>=julianday(?) AND julianday(c.scheduled_at)<julianday(?) AND NOT EXISTS(SELECT 1 FROM invoice_items ii WHERE ii.class_id=c.id) ${studentId === undefined ? "" : "AND c.student_id=?"} ORDER BY c.student_id,julianday(c.scheduled_at)`,
    args: studentId === undefined ? [start, end] : [start, end, studentId],
  })).rows as unknown as InvoiceEligibleLesson[];
}

function roundedItems(classes: InvoiceEligibleLesson[]) {
  return classes.map((c) => ({
    c,
    amount: c.is_trial ? 0 : Math.round(Number(c.duration_minutes) * Math.round(Number(c.hourly_rate) * 100) / 60) / 100,
  }));
}

/** Inclusive Malaysian dates; selection, month grouping and claims commit together. */
export async function generateRangeDrafts(studentId: number, startDate: string, endDate: string, notes: string | null = null): Promise<number[]> {
  if (!Number.isSafeInteger(studentId) || studentId <= 0)
    throw new ActionValidationError("Choose a valid student");
  const start = businessDate(startDate), end = businessDate(endDate);
  if (start > end) throw new ActionValidationError("Period end must follow start");
  return withTransaction(async (tx) => {
    const lessons = await unclaimedLessons(tx, businessDateTime(`${start}T00:00`), businessDateTime(`${nextDate(end, 1)}T00:00`), studentId);
    if (!lessons.length) throw new ActionValidationError("No present, un-invoiced lessons in this period");
    return writeGroups(tx, lessons, notes, false);
  });
}

/** Monthly policy skips zero totals and records completion atomically with claims. */
export async function generateMonthlyDrafts(month: string) {
  const [start, end] = monthBounds(month);
  const marker = `monthly_invoice_run:${month}`;
  return withTransaction(async (tx) => {
    const previous = (await tx.execute({ sql: "SELECT value FROM settings WHERE key=?", args: [marker] })).rows[0];
    if (previous) return { month, alreadyProcessed: true, created: 0, invoiceIds: [] as number[] };
    const invoiceIds = await writeGroups(tx, await unclaimedLessons(tx, start, end), "Automatically generated monthly draft", true);
    await tx.execute({ sql: "INSERT INTO settings(key,value) VALUES(?,?)", args: [marker, JSON.stringify({ created: invoiceIds.length, completedAt: new Date().toISOString() })] });
    return { month, alreadyProcessed: false, created: invoiceIds.length, invoiceIds };
  });
}

async function writeGroups(tx: Transaction, lessons: InvoiceEligibleLesson[], notes: string | null, skipZero: boolean) {
  const groups = new Map<string, { studentId: number; month: string; lessons: InvoiceEligibleLesson[] }>();
  for (const lesson of lessons) {
    const month = billingMonth(String(lesson.scheduled_at)), key = `${lesson.student_id}:${month}`;
    if (!groups.has(key)) groups.set(key, { studentId: Number(lesson.student_id), month, lessons: [] });
    groups.get(key)!.lessons.push(lesson);
  }
  const ids: number[] = [];
  for (const group of groups.values()) {
    const items = roundedItems(group.lessons);
    const total = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    if (skipZero && total <= 0) continue;
    ids.push(await createDraftInvoice(tx, group.studentId, group.month, items, total, notes));
  }
  return ids;
}

async function createDraftInvoice(
  tx: Transaction,
  studentId: number,
  month: string,
  items: ReturnType<typeof roundedItems>,
  total: number,
  notes: string | null,
): Promise<number> {
  const [start, end] = monthBounds(month);
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
