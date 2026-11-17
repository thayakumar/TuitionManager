import {
  requireParent,
  PUBLIC_INVOICE_COLUMNS,
  invoiceCalendarPeriod,
} from "@/lib/portal-context";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Receipt,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { queryOne, queryAll, getSetting } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { currency, fmtDate } from "@/lib/format";
import type { Invoice, InvoiceItem } from "@/lib/types";

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
                <p className="text-sm text-muted-foreground">Total Invoiced</p>
                <p className="text-xl font-bold mt-1 text-foreground">
                  {currency(totalInvoiced, currencySymbol)}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-50">
                <Receipt size={20} className="text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">
                  {currency(totalPaid, currencySymbol)}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={20} className="text-emerald-500" />
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
                  className={`text-xl font-bold mt-1 ${outstanding > 0 ? "text-red-600" : "text-foreground"}`}
                >
                  {currency(outstanding, currencySymbol)}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
                <AlertTriangle size={20} className="text-amber-500" />
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
            />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const statusColor =
              inv.status === "paid"
                ? "bg-emerald-500"
                : inv.status === "overdue"
                  ? "bg-red-500"
                  : inv.status === "sent"
                    ? "bg-blue-500"
                    : "bg-gray-400";

            return (
              <Link
                key={inv.id}
                href={`/share/${params.token}/invoices/${inv.id}`}
              >
                <Card className="border shadow-none overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                  <div
                    className={`border-l-4 ${
                      inv.status === "paid"
                        ? "border-emerald-500"
                        : inv.status === "overdue"
                          ? "border-red-500"
                          : inv.status === "sent"
                            ? "border-blue-500"
                            : "border-gray-300"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground group-hover:text-orange-600 transition-colors">
                              {inv.invoice_number}
                            </h3>
                            <Badge
                              className={`text-xs text-white capitalize ${statusColor}`}
                            >
                              {inv.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Period: {fmtDate(invoiceCalendarPeriod(inv).start)}{" "}
                            — {fmtDate(invoiceCalendarPeriod(inv).end)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Issued: {fmtDate(inv.issued_at)}
                            {inv.paid_at
                              ? ` · Paid: ${fmtDate(inv.paid_at)}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <p className="text-lg font-bold text-foreground">
                            {currency(Number(inv.total_amount), currencySymbol)}
                          </p>
                          <ArrowRight
                            size={16}
                            className="text-muted-foreground/50 group-hover:text-orange-500 transition-colors"
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
