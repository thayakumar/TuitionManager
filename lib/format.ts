import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

const TZ = "Asia/Kuala_Lumpur";

/** SQLite timestamps without an offset are UTC; date-only values are business dates. */
function parseMYT(value: string): TZDate {
  let iso = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) iso += "T00:00:00+08:00";
  else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(iso))
    iso = iso.replace(" ", "T") + "Z";
  return new TZDate(new Date(iso).getTime(), TZ);
}

export function currency(amount: number, symbol = "RM"): string {
  return `${symbol} ${Number(amount).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function fmtDate(iso: string): string {
  return format(parseMYT(iso), "EEE, d MMM yyyy");
}
export function fmtDateTime(iso: string): string {
  return format(parseMYT(iso), "EEE, d MMM yyyy • h:mm a");
}
export function fmtTime(iso: string): string {
  return format(parseMYT(iso), "h:mm a");
}
export function fmtDateInput(iso: string): string {
  return format(parseMYT(iso), "yyyy-MM-dd'T'HH:mm");
}
export function fmtISODate(iso: string): string {
  return format(parseMYT(iso), "yyyy-MM-dd");
}
export function fmtShortDate(iso: string): string {
  return format(parseMYT(iso), "MMM d");
}
