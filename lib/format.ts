import { format, parseISO } from "date-fns";
import { TZDate } from "@date-fns/tz";

const TZ = "Asia/Kuala_Lumpur";

function parseMYT(iso: string): TZDate {
  return new TZDate(parseISO(iso).getTime(), TZ);
}

export function currency(amount: number, symbol: string = "RM"): string {
  return `${symbol} ${amount.toFixed(2)}`;
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
