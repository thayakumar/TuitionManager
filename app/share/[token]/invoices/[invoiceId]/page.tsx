import { requireParent, invoiceCalendarPeriod } from "@/lib/portal-context";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Info, ArrowLeft } from "lucide-react";
import { queryOne, queryAll, getSettings } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Invoice, InvoiceItem, Student } from "@/lib/types";
import PrintButton from "@/app/invoices/[id]/PrintButton";

export const dynamic = "force-dynamic";

function statusColor(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-500";
    case "overdue":
      return "bg-red-500";
    case "sent":
      return "bg-blue-500";
    case "draft":
      return "bg-gray-400";
    default:
      return "bg-gray-300";
  }
}

export default async function ParentInvoiceDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string; invoiceId: string }>;
}) {
  const params = await paramsPromise;
  const parentStudent = await requireParent(params.token);

  const invoiceId = Number(params.invoiceId);
  if (!Number.isSafeInteger(invoiceId) || invoiceId < 1) notFound();
  const inv = await queryOne<Invoice>(
    "SELECT id, student_id, invoice_number, period_start, period_end, total_amount, status, issued_at, paid_at, notes, billing_month FROM invoices WHERE id = ? AND student_id = ? AND status<>'draft'",
    [invoiceId, parentStudent.id],
  );
  if (!inv) notFound();

  const student = parentStudent;
  const [items, settings] = await Promise.all([
    queryAll<InvoiceItem>(
      "SELECT id,invoice_id,class_id,description,quantity,unit_amount,amount FROM invoice_items WHERE invoice_id=? AND NOT (amount=0 AND description LIKE '[CANCELLED]%') ORDER BY id",
      [invoiceId],
    ),
    getSettings([
      "business_name",
      "business_contact",
      "payment_instructions",
      "currency",
      "duitnow_qr",
    ]),
  ]);
  const {
    business_name: businessName,
    business_contact: businessContact,
    payment_instructions: paymentInstructions,
    currency: currencySymbol,
    duitnow_qr: duitnowQr,
  } = settings;

  if (!student) notFound();

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <Link href={`/share/${params.token}/invoices`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <span>{inv.invoice_number}</span>
            </div>
          }
          subtitle={`${fmtDate(invoiceCalendarPeriod(inv).start)} — ${fmtDate(invoiceCalendarPeriod(inv).end)}`}
          action={<PrintButton />}
        />
      </div>

      {/* Invoice Document */}
      <Card className="mb-6 border shadow-none overflow-hidden">
        {/* Gradient Header */}
        <div className="invoice-document-header bg-[#b82f25] px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-bold">{businessName}</div>
              {businessContact && (
                <div className="text-sm text-white/70 whitespace-pre-line mt-1">
                  {businessContact}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight">INVOICE</div>
              <div className="text-sm text-white/80 mt-1">
                {inv.invoice_number}
              </div>
              <div className="text-xs text-white/60 mt-0.5">
                Issued {fmtDate(inv.issued_at)}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="pt-6 px-8 pb-8">
          {/* Bill To */}
          <div className="mb-8 rounded-xl bg-secondary/40 p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
              Bill To
            </div>
            <div className="text-base font-semibold text-foreground">
              {student.name}
            </div>
            {student.guardian_name && (
              <div className="text-sm text-foreground/80">
                c/o {student.guardian_name}
              </div>
            )}
            {(student.email || student.phone) && (
              <div className="text-sm text-muted-foreground mt-0.5">
                {student.email}
                {student.email && student.phone ? " · " : ""}
                {student.phone}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge
              className={`text-xs text-white capitalize ${statusColor(inv.status)}`}
            >
              {inv.status}
            </Badge>
          </div>

          {/* Items Table */}
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-right font-semibold">
                    Hours
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Rate
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const isCancelled = it.description.startsWith("[CANCELLED]");
                  return (
                    <TableRow
                      key={it.id}
                      className={`${isCancelled ? "text-muted-foreground line-through" : ""} ${
                        idx % 2 === 1 ? "bg-secondary/20" : ""
                      }`}
                    >
                      <TableCell className="font-medium">
                        {it.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(it.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency(Number(it.unit_amount), currencySymbol)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {currency(Number(it.amount), currencySymbol)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="flex justify-end mt-4">
            <div className="bg-[#edf5f1] border border-[#dce9e2] rounded-xl px-6 py-4 text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Amount
              </div>
              <div className="text-3xl font-bold text-foreground">
                {currency(Number(inv.total_amount), currencySymbol)}
              </div>
            </div>
          </div>

          {inv.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
                  Notes
                </div>
                <div className="text-sm whitespace-pre-wrap text-foreground/80">
                  {inv.notes}
                </div>
              </div>
            </>
          )}

          {/* Payment Instructions + DuitNow QR */}
          {(paymentInstructions || duitnowQr) && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0">
                  <Info size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-blue-600 uppercase tracking-widest font-semibold mb-1">
                    Payment Instructions
                  </div>
                  {paymentInstructions && (
                    <div className="text-sm whitespace-pre-wrap text-blue-900/80">
                      {paymentInstructions}
                    </div>
                  )}
                </div>
                {duitnowQr && (
                  <div className="shrink-0 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={duitnowQr}
                      alt="DuitNow QR"
                      className="max-w-24 rounded-lg border bg-white p-1.5"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      DuitNow
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {inv.paid_at && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-700">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">
                  Paid on {fmtDate(inv.paid_at)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
