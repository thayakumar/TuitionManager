export { generateMonthlyDrafts } from "./invoice-generation";

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
