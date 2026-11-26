import {
  requireParent,
  PUBLIC_INVOICE_COLUMNS,
  invoiceCalendarPeriod,
} from "@/lib/portal-context";
import Link from "next/link";
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { queryAll, getSetting } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { invoiceStatusBadgeClass } from "@/components/invoice-document";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currency, fmtDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParentInvoicesPage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>;
}) {
  const params = await paramsPromise;
  const student = await requireParent(params.token);
  const studentId = student.id;
  const currencySymbol = await getSetting("currency");

  const invoices = await queryAll<Invoice>(
    `SELECT ${PUBLIC_INVOICE_COLUMNS} FROM invoices WHERE student_id = ? AND status<>'draft' ORDER BY issued_at DESC,id DESC`,
    [studentId],
  );

  const totalInvoiced = invoices
    .filter((i) => i.status !== "canceled")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const outstanding = totalInvoiced - totalPaid;

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total invoiced</p>
                <p className="text-xl font-bold mt-1 text-foreground">
                  {currency(totalInvoiced, currencySymbol)}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                <Receipt size={20} className="text-primary" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total paid</p>
                <p className="text-xl font-bold mt-1 text-emerald-700">
                  {currency(totalPaid, currencySymbol)}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={20} className="text-emerald-700" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p
                  className={`text-xl font-bold mt-1 ${outstanding > 0 ? "text-destructive" : "text-foreground"}`}
                >
                  {currency(outstanding, currencySymbol)}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
                <AlertTriangle size={20} className="text-amber-700" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <Card className="border shadow-none">
          <CardContent className="p-8 text-center">
            <Receipt
              size={40}
              className="mx-auto mb-3 text-muted-foreground/30"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const period = invoiceCalendarPeriod(inv);
            return (
              <Link
                key={inv.id}
                href={`/share/${params.token}/invoices/${inv.id}`}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="border shadow-none overflow-hidden hover:border-primary/40 transition-colors cursor-pointer group">
                  <div
                    className={`border-l-4 ${
                      inv.status === "paid"
                        ? "border-emerald-700"
                        : inv.status === "overdue"
                          ? "border-red-700"
                          : inv.status === "sent"
                            ? "border-sky-700"
                            : "border-slate-400"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {inv.invoice_number}
                            </h2>
                            <Badge
                              className={`text-xs capitalize ${invoiceStatusBadgeClass(inv.status)}`}
                            >
                              {inv.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Period: {fmtDate(period.start)} — {fmtDate(period.end)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Issued: {fmtDate(inv.issued_at)}
                            {inv.paid_at
                              ? ` · Paid: ${fmtDate(inv.paid_at)}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2 shrink-0">
                          <p className="text-lg font-bold text-foreground">
                            {currency(Number(inv.total_amount), currencySymbol)}
                          </p>
                          <ArrowRight
                            size={16}
                            className="text-muted-foreground/60 group-hover:text-primary transition-colors"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      {inv.notes && (
                        <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            {inv.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
