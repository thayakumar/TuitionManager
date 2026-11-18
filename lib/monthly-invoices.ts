import { withTransaction } from "./db";
import { monthBounds } from "./domain/business-time";
import { unclaimedLessons, createDraftInvoice } from "./invoice-generation";

/** Daily 15:59 UTC is 23:59 Malaysia. Allow an hour of scheduler delivery delay. */
export function dueInvoiceMonth(now: Date): string | null {
  if (!Number.isFinite(now.getTime())) return null;
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const tomorrow = new Date(local.getTime() + 86400000);
  if (tomorrow.getUTCDate() === 1 && local.getUTCHours() === 23 && local.getUTCMinutes() === 59)
    return local.toISOString().slice(0, 7);
  if (local.getUTCDate() === 1 && local.getUTCHours() === 0)
    return new Date(local.getTime() - 86400000).toISOString().slice(0, 7);
  return null;
}

export async function generateMonthlyDrafts(month: string) {
  const [start, end] = monthBounds(month);
  const marker = `monthly_invoice_run:${month}`;
  return withTransaction(async (tx) => {
    const previous = (await tx.execute({ sql: "SELECT value FROM settings WHERE key=?", args: [marker] })).rows[0];
    if (previous) return { month, alreadyProcessed: true, created: 0, invoiceIds: [] as number[] };
    // Deactivated students retain billable history. Empty/zero-value months
    // do not generate automatic invoices.
    const students = (await tx.execute({
      sql: `SELECT s.id FROM students s WHERE EXISTS(SELECT 1 FROM classes c WHERE c.student_id=s.id AND c.status='completed' AND c.attendance IN ('present','late') AND julianday(c.scheduled_at)>=julianday(?) AND julianday(c.scheduled_at)<julianday(?) AND NOT EXISTS(SELECT 1 FROM invoice_items ii WHERE ii.class_id=c.id)) ORDER BY s.id`,
      args: [start, end],
    })).rows;
    const invoiceIds: number[] = [];
    for (const student of students) {
      const studentId = Number(student.id);
      const lessons = await unclaimedLessons(tx, studentId, start, end);
      const total = lessons.reduce((sum, c) => sum + (c.is_trial ? 0 : Math.round(Number(c.duration_minutes) * Math.round(Number(c.hourly_rate) * 100) / 60)), 0);
      if (total <= 0) continue;
      invoiceIds.push(await createDraftInvoice(tx, studentId, month, lessons, "Automatically generated monthly draft"));
    }
    await tx.execute({ sql: "INSERT INTO settings(key,value) VALUES(?,?)", args: [marker, JSON.stringify({ created: invoiceIds.length, completedAt: new Date().toISOString() })] });
    return { month, alreadyProcessed: false, created: invoiceIds.length, invoiceIds };
  });
}
