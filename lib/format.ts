import { format, parseISO } from "date-fns";
import { getSetting } from "./db";

export function currency(amount: number): string {
  const symbol = getSetting("currency") || "RM";
  return `${symbol} ${amount.toFixed(2)}`;
}

export function fmtDate(iso: string): string {
  return format(parseISO(iso), "EEE, d MMM yyyy");
}

export function fmtDateTime(iso: string): string {
  return format(parseISO(iso), "EEE, d MMM yyyy • h:mm a");
}

export function fmtTime(iso: string): string {
  return format(parseISO(iso), "h:mm a");
}

export function fmtDateInput(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
}

export function fmtISODate(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}
