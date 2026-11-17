import { TableExplorer } from "@/components/table-explorer";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { queryAll, getSettings } from "@/lib/db";
import {
  financeTotals,
  invoiceBillingMonth,
  monthlyRevenue,
  type FinanceInvoice,
} from "@/lib/finance";
import { currency, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { RevenueChart, RevenueTrend } from "@/components/revenue-chart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
type Filters = {
  from?: string;
  to?: string;
  student?: string;
  status?: string;
};
export default async function FinancialHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  await requireAdminPage();
  const filters = await searchParams;
  const [invoices, students, settings] = await Promise.all([
    queryAll<FinanceInvoice>(
      "SELECT i.id,i.student_id,i.invoice_number,i.period_start,i.period_end,i.billing_month,i.total_amount,i.status,i.issued_at,i.paid_at,s.name AS student_name FROM invoices i JOIN students s ON s.id=i.student_id ORDER BY i.period_start DESC,i.id DESC",
    ),
    queryAll<{ id: number; name: string }>(
      "SELECT id,name FROM students ORDER BY name",
    ),
    getSettings(["currency"]),
  ]);
  const validMonth = (v?: string) =>
    v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : undefined;
  const from = validMonth(filters.from),
    to = validMonth(filters.to),
    student = Number(filters.student) || null,
    status = ["draft", "sent", "paid", "overdue", "canceled"].includes(
      filters.status ?? "",
    )
      ? filters.status
      : undefined;
  const filtered = invoices.filter(
    (i) =>
      (!from || invoiceBillingMonth(i) >= from) &&
      (!to || invoiceBillingMonth(i) <= to) &&
      (!student || i.student_id === student) &&
      (!status || i.status === status),
  );
  const totals = financeTotals(filtered),
    months = monthlyRevenue(filtered),
    symbol = settings.currency || "RM";
  return (
    <>
      <PageHeader
        title="Financial history"
        subtitle="Your complete tuition history, with revenue attributed to the month the lessons were invoiced for."
        action={
          <Link href="/invoices">
            <Button variant="outline">Manage invoices</Button>
          </Link>
        }
      />
      <form
        className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[1fr_1fr_1.5fr_1fr_auto]"
        method="get"
      >
        <label className="text-xs font-medium text-muted-foreground">
          From month
          <input
            className="mt-1 w-full rounded-xl border border-input bg-card p-2 text-sm"
            type="month"
            name="from"
            defaultValue={from}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Through month
          <input
            className="mt-1 w-full rounded-xl border border-input bg-card p-2 text-sm"
            type="month"
            name="to"
            defaultValue={to}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Student
          <select
            className="mt-1 w-full rounded-xl border border-input bg-card p-2 text-sm"
            name="student"
            defaultValue={student ?? ""}
          >
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Status
          <select
            className="mt-1 w-full rounded-xl border border-input bg-card p-2 text-sm"
            name="status"
            defaultValue={status ?? ""}
          >
            <option value="">All statuses</option>
            {["draft", "sent", "paid", "overdue", "canceled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
          <Button type="submit">Apply</Button>
          <Link
            href="/financial-history"
            className="inline-flex min-h-11 items-center px-2 text-xs text-muted-foreground underline"
          >
            Clear
          </Link>
        </div>
      </form>
      {from && to && from > to && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Choose a through month on or after the starting month.
        </p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Revenue", totals.revenue, "Paid + outstanding"],
          ["Paid", totals.paid, "Allocated to billing month"],
          ["Outstanding", totals.outstanding, "Active unpaid invoices"],
          [
            "Active invoices",
            totals.count,
            `${totals.canceledCount} cancelled excluded`,
          ],
        ].map(([label, value, sub], index) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 break-words text-2xl font-bold">
                {index === 3 ? value : currency(Number(value), symbol)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly revenue</CardTitle>
            <CardDescription>
              Paid and outstanding amounts for each billing month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={months} symbol={symbol} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
            <CardDescription>
              Cancelled invoices never contribute to revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueTrend data={months} symbol={symbol} />
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monthly breakdown</CardTitle>
          <CardDescription>
            Later payment changes Paid and Outstanding, while the revenue stays
            with its original billing month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TableExplorer><table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-3 pr-4">Month</th>
                  <th className="p-3 text-right">Revenue</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">{m.month}</td>
                    <td className="p-3 text-right">
                      {currency(m.revenue, symbol)}
                    </td>
                    <td className="p-3 text-right">
                      {currency(m.paid, symbol)}
                    </td>
                    <td className="p-3 text-right">
                      {currency(m.outstanding, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></TableExplorer>
            {!months.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No active revenue in this selection.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
          <CardDescription>
            {filtered.length} invoices in this selection, including cancelled
            documents for history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TableExplorer><table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-3 pr-4">Invoice</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Billing month</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-b border-border/50">
                    <td className="whitespace-nowrap py-3 pr-4">
                      <Link
                        className="font-semibold text-primary hover:underline"
                        href={`/invoices/${i.id}`}
                      >
                        {i.invoice_number}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Issued {fmtDate(i.issued_at)}
                      </p>
                    </td>
                    <td className="p-3">{i.student_name}</td>
                    <td className="p-3">{invoiceBillingMonth(i)}</td>
                    <td className="p-3">
                      <Badge
                        variant={i.status === "paid" ? "default" : "outline"}
                        className="capitalize"
                      >
                        {i.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">
                      {currency(Number(i.total_amount), symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></TableExplorer>
            {!filtered.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No invoices match these filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
