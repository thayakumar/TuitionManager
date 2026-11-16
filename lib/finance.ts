export type FinanceInvoice = {
  id: number;
  student_id: number;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: string;
  issued_at: string;
  paid_at?: string | null;
  billing_month?: string | null;
  student_name?: string;
};
export type MonthlyRevenue = {
  month: string;
  paid: number;
  outstanding: number;
  revenue: number;
  count: number;
};
export function invoiceBillingMonth(
  invoice: Pick<FinanceInvoice, "billing_month" | "period_start">,
): string {
  if (invoice.billing_month && /^\d{4}-\d{2}$/.test(invoice.billing_month))
    return invoice.billing_month;
  const date = new Date(invoice.period_start);
  if (!Number.isFinite(date.getTime())) return invoice.period_start.slice(0, 7);
  return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 7);
}
export function financeTotals(invoices: FinanceInvoice[]) {
  const active = invoices.filter((invoice) => invoice.status !== "canceled");
  const paid = active.reduce(
    (sum, invoice) =>
      sum + (invoice.status === "paid" ? Number(invoice.total_amount) : 0),
    0,
  );
  const outstanding = active.reduce(
    (sum, invoice) =>
      sum + (invoice.status !== "paid" ? Number(invoice.total_amount) : 0),
    0,
  );
  return {
    revenue: paid + outstanding,
    paid,
    outstanding,
    count: active.length,
    canceledCount: invoices.length - active.length,
  };
}
export function monthlyRevenue(invoices: FinanceInvoice[]): MonthlyRevenue[] {
  const months = new Map<string, MonthlyRevenue>();
  for (const invoice of invoices) {
    if (invoice.status === "canceled") continue;
    const month = invoiceBillingMonth(invoice);
    const value = months.get(month) ?? {
      month,
      paid: 0,
      outstanding: 0,
      revenue: 0,
      count: 0,
    };
    const amount = Number(invoice.total_amount);
    value.revenue += amount;
    value.count += 1;
    if (invoice.status === "paid") value.paid += amount;
    else value.outstanding += amount;
    months.set(month, value);
  }
  const ordered = [...months.values()].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  if (!ordered.length) return [];
  const first = ordered[0].month,
    last = ordered[ordered.length - 1].month;
  const cursor = new Date(`${first}-01T00:00:00Z`);
  const filled: MonthlyRevenue[] = [];
  while (cursor.toISOString().slice(0, 7) <= last && filled.length < 1200) {
    const month = cursor.toISOString().slice(0, 7);
    filled.push(
      months.get(month) ?? {
        month,
        paid: 0,
        outstanding: 0,
        revenue: 0,
        count: 0,
      },
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return filled;
}
export function currentBillingMonth(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 7);
}
