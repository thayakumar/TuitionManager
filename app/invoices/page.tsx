import { TableExplorer } from "@/components/table-explorer";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { queryAll, getSettings } from "@/lib/db";
import {
  financeTotals,
  currentBillingMonth,
  invoiceBillingMonth,
  type FinanceInvoice,
} from "@/lib/finance";
import { currency, fmtDate } from "@/lib/format";
import { GenerateInvoiceDialog } from "@/components/generate-invoice-dialog";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/export-button";
import { exportInvoicesCsv } from "@/lib/export";
export const dynamic = "force-dynamic";
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = ["draft", "sent", "paid", "overdue", "canceled"].includes(
    params.status ?? "",
  )
    ? params.status
    : null;
  const [invoices, students, settings] = await Promise.all([
    queryAll<FinanceInvoice>(
      "SELECT i.id,i.student_id,i.invoice_number,i.period_start,i.period_end,i.billing_month,i.total_amount,i.status,i.issued_at,i.paid_at,s.name AS student_name FROM invoices i JOIN students s ON s.id=i.student_id ORDER BY i.issued_at DESC,i.id DESC",
    ),
    queryAll<{ id: number; name: string }>(
      "SELECT id,name FROM students WHERE active=1 ORDER BY name",
    ),
    getSettings(["currency"]),
  ]);
  const totals = financeTotals(invoices),
    month = financeTotals(
      invoices.filter((i) => invoiceBillingMonth(i) === currentBillingMonth()),
    ),
    symbol = settings.currency || "RM",
    visible = status ? invoices.filter((i) => i.status === status) : invoices;
  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} documents · ${currency(totals.outstanding, symbol)} outstanding`}
        action={
          <div className="flex gap-2">
            <ExportButton getData={exportInvoicesCsv} filename="invoices.csv" />
            <GenerateInvoiceDialog students={students} />
          </div>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            "Outstanding",
            currency(totals.outstanding, symbol),
            "Active unpaid invoices",
          ],
          [
            "Revenue this month",
            currency(month.revenue, symbol),
            "Paid + outstanding · billing month",
          ],
          [
            "Paid for this month",
            currency(month.paid, symbol),
            "Attributed to billing month",
          ],
          [
            "Active invoices",
            String(totals.count),
            `${totals.canceledCount} cancelled excluded`,
          ],
        ].map(([title, value, sub]) => (
          <Card key={title}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="mt-2 break-words text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div
        className="mb-5 flex flex-wrap items-center gap-2"
        aria-label="Filter invoices by status"
      >
        {["all", "draft", "sent", "paid", "overdue", "canceled"].map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/invoices" : `/invoices?status=${s}`}
            aria-current={(status ?? "all") === s ? "page" : undefined}
            className={`rounded-full border px-3 py-2 text-xs capitalize ${(status ?? "all") === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"}`}
          >
            {s} (
            {s === "all"
              ? invoices.length
              : invoices.filter((i) => i.status === s).length}
            )
          </Link>
        ))}
        <Link
          className="ml-auto text-xs font-semibold text-primary hover:underline"
          href="/financial-history"
        >
          Financial history →
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {status
              ? `${status[0].toUpperCase() + status.slice(1)} invoices`
              : "All invoices"}
          </CardTitle>
          <CardDescription>
            {visible.length} documents in this view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TableExplorer><table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-3 pr-4">Invoice</th>
                  <th className="p-3">Student</th>
                  <th className="hidden p-3 md:table-cell">Period</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-border/60 hover:bg-secondary/40"
                  >
                    <td className="whitespace-nowrap py-4 pr-4">
                      <Link
                        href={`/invoices/${i.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {i.invoice_number}
                      </Link>
                    </td>
                    <td className="p-3">{i.student_name}</td>
                    <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">
                      {fmtDate(i.period_start)} – {fmtDate(/T16:00:00(?:\.000)?Z$/.test(i.period_end) ? new Date(Date.parse(i.period_end) - 1).toISOString() : i.period_end)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right font-semibold">
                      {currency(Number(i.total_amount), symbol)}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          i.status === "paid"
                            ? "default"
                            : i.status === "overdue"
                              ? "destructive"
                              : "outline"
                        }
                        className="capitalize"
                      >
                        {i.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></TableExplorer>
            {!visible.length && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {status
                  ? "No invoices match this status."
                  : "No invoices yet. Generate one from completed, attended lessons."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
