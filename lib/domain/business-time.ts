import { ActionValidationError } from "../action-errors";
// datetime-local controls represent the tutor's Malaysian business clock, not server time.
export function businessDateTime(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
      raw,
    )
  )
    throw new ActionValidationError("Enter a valid date and time");
  businessDate(raw.slice(0, 10));
  const naive = !/(?:Z|[+-]\d{2}:\d{2})$/.test(raw);
  const date = new Date(naive ? `${raw}+08:00` : raw);
  if (!Number.isFinite(date.getTime()))
    throw new ActionValidationError("Enter a valid date and time");
  if (
    naive &&
    new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 16) !==
      raw.slice(0, 16)
  )
    throw new ActionValidationError("Enter a valid calendar date");
  return date.toISOString();
}
export function businessDate(value: unknown): string {
  const s = String(value ?? "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(`${s}T00:00:00Z`)) ||
    new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s
  )
    throw new ActionValidationError("Enter a valid calendar date");
  return s;
}
export function billingMonth(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3600000)
    .toISOString()
    .slice(0, 7);
}
export function nextDate(date: string, days: number): string {
  return new Date(
    Date.parse(`${businessDate(date)}T00:00:00Z`) + days * 86400000,
  )
    .toISOString()
    .slice(0, 10);
}
export function monthBounds(month: string): [string, string] {
  if (!/^\d{4}-\d{2}$/.test(month))
    throw new ActionValidationError("Invalid billing month");
  const start = businessDateTime(`${month}-01T00:00`);
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return [start, businessDateTime(`${d.toISOString().slice(0, 10)}T00:00`)];
}
