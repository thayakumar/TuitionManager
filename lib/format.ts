import { format, parseISO } from "date-fns";

export function currency(amount: number, symbol: string = "RM"): string {
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

export function fmtShortDate(iso: string): string {
  return format(parseISO(iso), "MMM d");
}
