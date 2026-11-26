import { CheckCircle2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { currency, fmtDate } from "@/lib/format";
import { invoiceCalendarPeriod } from "@/lib/portal-context";
import type { Invoice, InvoiceItem } from "@/lib/types";

export function invoiceStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-700 text-white border-0";
    case "overdue":
      return "bg-red-700 text-white border-0";
    case "sent":
      return "bg-sky-700 text-white border-0";
    case "draft":
      return "bg-slate-600 text-white border-0";
    default:
      return "bg-slate-500 text-white border-0";
  }
}

export function InvoiceDocument({
  invoice,
  student,
  items,
  businessName,
  businessContact,
  paymentInstructions,
  currencySymbol,
  duitnowQr,
}: {
  invoice: Invoice & { billing_month?: string | null };
  student: {
    name: string;
    guardian_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: InvoiceItem[];
  businessName: string;
  businessContact: string;
  paymentInstructions: string;
  currencySymbol: string;
  duitnowQr: string;
}) {
  const symbol = currencySymbol || "RM";
  const period = invoiceCalendarPeriod(invoice);

  return (
    <Card className="mb-6 border shadow-none overflow-hidden">
      <div className="invoice-document-header bg-primary px-4 py-6 sm:px-8 text-primary-foreground">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="text-lg font-bold">{businessName}</div>
            {businessContact && (
              <div className="text-sm text-primary-foreground/85 whitespace-pre-line mt-1">
                {businessContact}
              </div>
            )}
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">
              INVOICE
            </div>
            <div className="text-sm text-primary-foreground/85 mt-1">
              {invoice.invoice_number}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4 sm:p-8">
        <div className="invoice-section grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Bill To
            </div>
            <div className="text-base font-bold text-foreground">
              {student.name}
            </div>
            {student.guardian_name && (
              <div className="text-sm text-muted-foreground">
                Guardian: {student.guardian_name}
              </div>
            )}
            {student.email && (
              <div className="text-sm text-muted-foreground">
                {student.email}
              </div>
            )}
            {student.phone && (
              <div className="text-sm text-muted-foreground">
                {student.phone}
              </div>
            )}
          </div>
          <div className="sm:text-right space-y-1">
            <div className="flex sm:justify-end items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Badge
                className={`capitalize ${invoiceStatusBadgeClass(invoice.status)}`}
              >
                {invoice.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Issued:{" "}
              <span className="font-medium text-foreground">
                {fmtDate(invoice.issued_at)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Period:{" "}
              <span className="font-medium text-foreground">
                {fmtDate(period.start)} — {fmtDate(period.end)}
              </span>
            </div>
            {invoice.paid_at && (
              <div className="text-sm text-emerald-700 font-medium flex sm:justify-end items-center gap-1">
                <CheckCircle2 size={14} aria-hidden="true" />
                Paid: {fmtDate(invoice.paid_at)}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Date, time &amp; duration</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {Number(item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {currency(Number(item.unit_amount), symbol)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {currency(Number(item.amount), symbol)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="invoice-section flex justify-end mb-6">
          <div className="w-full sm:w-72 rounded-xl bg-secondary p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Total Due
              </span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {currency(Number(invoice.total_amount), symbol)}
              </span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="invoice-section mb-6 rounded-xl bg-muted/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Notes
            </div>
            <p className="text-sm text-foreground whitespace-pre-line">
              {invoice.notes}
            </p>
          </div>
        )}

        {(paymentInstructions || duitnowQr) && (
          <>
            <Separator className="my-6" />
            <div className="invoice-section rounded-xl border border-border bg-secondary/50 p-5">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
                    <Info size={16} className="text-primary" aria-hidden="true" />
                    Payment Instructions
                  </div>
                  {paymentInstructions && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {paymentInstructions}
                    </p>
                  )}
                </div>
                {duitnowQr && (
                  <div className="shrink-0 text-center">
                    <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
                      <img
                        src={duitnowQr}
                        alt="DuitNow QR Code"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-1.5">
                      Scan to pay (DuitNow)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
