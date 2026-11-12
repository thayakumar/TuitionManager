import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Trash2, CheckCircle2, Clock, AlertCircle, FileText,
  CreditCard, QrCode, Info, User, ArrowLeft,
} from "lucide-react";
import { queryOne, queryAll, getSetting } from "@/lib/db";
import { setInvoiceStatus, deleteInvoice } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { Invoice, InvoiceItem, Student, InvoiceStatus } from "@/lib/types";
import PrintButton from "./PrintButton";
import { WhatsAppShare } from "@/components/whatsapp-share";

export const dynamic = "force-dynamic";

const STATUSES: { value: InvoiceStatus; label: string; icon: React.ReactNode }[] = [
  { value: "draft", label: "Draft", icon: <FileText size={14} /> },
  { value: "sent", label: "Sent", icon: <Clock size={14} /> },
  { value: "paid", label: "Paid", icon: <CheckCircle2 size={14} /> },
  { value: "overdue", label: "Overdue", icon: <AlertCircle size={14} /> },
  { value: "canceled", label: "Canceled", icon: <Trash2 size={14} /> },
];

function statusVariant(status: string) {
  switch (status) {
    case "paid":
      return "default" as const;
    case "overdue":
      return "destructive" as const;
    case "sent":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

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

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const inv = await queryOne<Invoice>("SELECT id, student_id, invoice_number, period_start, period_end, total_amount, status, issued_at, paid_at, notes FROM invoices WHERE id = ?", [id]);
  if (!inv) notFound();

  const [student, items, businessName, businessContact, paymentInstructions, currencySymbol, duitnowQr] =
    await Promise.all([
      queryOne<Student>("SELECT id, name, email, phone, guardian_name, guardian_contact, hourly_rate, notes, active, created_at FROM students WHERE id = ?", [inv.student_id]),
      queryAll<InvoiceItem>(
        "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id",
        [id]
      ),
      getSetting("business_name"),
      getSetting("business_contact"),
      getSetting("payment_instructions"),
      getSetting("currency"),
      getSetting("duitnow_qr"),
    ]);

  if (!student) notFound();

  const del = deleteInvoice.bind(null, id);

  const whatsappText = [
    `Invoice ${inv.invoice_number}`,
    `Student: ${student.name}`,
    `Period: ${fmtDate(inv.period_start)} — ${fmtDate(inv.period_end)}`,
    `Total: ${currency(Number(inv.total_amount), currencySymbol)}`,
    `Status: ${inv.status}`,
  ].join("\n");

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <Link href="/invoices">
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <span>{inv.invoice_number}</span>
            </div>
          }
          subtitle={`${student.name} · ${fmtDate(inv.period_start)} — ${fmtDate(inv.period_end)}`}
          action={
            <div className="flex gap-2">
              <WhatsAppShare text={whatsappText} />
              <PrintButton />
              <Link href={`/students/${student.id}`}>
                <Button variant="secondary">
                  <User size={14} /> Student
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      {/* Status Toggle */}
      <Card className="mb-6 no-print shadow-sm border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard size={18} className="text-indigo-500" />
            Invoice Status
          </CardTitle>
          <CardDescription>Update the current status of this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 p-1 bg-secondary/50 rounded-xl w-fit">
            {STATUSES.map((s) => (
              <form key={s.value} action={setInvoiceStatus.bind(null, id, s.value)}>
                <Button
                  type="submit"
                  variant={inv.status === s.value ? "default" : "ghost"}
                  size="sm"
                  className={`capitalize gap-1.5 rounded-lg ${
                    inv.status === s.value ? "shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Document */}
      <Card className="mb-6 shadow-sm border-0 overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-bold">{businessName}</div>
              {businessContact && (
                <div className="text-sm text-white/70 whitespace-pre-line mt-1">{businessContact}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight">INVOICE</div>
              <div className="text-sm text-white/80 mt-1">{inv.invoice_number}</div>
              <div className="text-xs text-white/60 mt-0.5">Issued {fmtDate(inv.issued_at)}</div>
            </div>
          </div>
        </div>

        <CardContent className="pt-6 px-8 pb-8">
          {/* Bill To */}
          <div className="mb-8 rounded-xl bg-secondary/40 p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
              Bill To
            </div>
            <div className="text-base font-semibold text-foreground">{student.name}</div>
            {student.guardian_name && (
              <div className="text-sm text-foreground/80">c/o {student.guardian_name}</div>
            )}
            {(student.email || student.phone) && (
              <div className="text-sm text-muted-foreground mt-0.5">
                {student.email}
                {student.email && student.phone ? " · " : ""}
                {student.phone}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-right font-semibold">Hours</TableHead>
                  <TableHead className="text-right font-semibold">Rate</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
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
                      <TableCell className="font-medium">{it.description}</TableCell>
                      <TableCell className="text-right">{Number(it.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency(Number(it.unit_amount), currencySymbol)}</TableCell>
                      <TableCell className="text-right font-medium">{currency(Number(it.amount), currencySymbol)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="flex justify-end mt-4">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl px-6 py-4 text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Amount</div>
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
                <div className="text-sm whitespace-pre-wrap text-foreground/80">{inv.notes}</div>
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
                    <div className="text-sm whitespace-pre-wrap text-blue-900/80">{paymentInstructions}</div>
                  )}
                </div>
                {duitnowQr && (
                  <div className="shrink-0 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={duitnowQr} alt="DuitNow QR" className="max-w-24 rounded-lg border bg-white p-1.5" />
                    <div className="text-[10px] text-muted-foreground mt-1">DuitNow</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {inv.paid_at && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-700">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">Paid on {fmtDate(inv.paid_at)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="no-print shadow-sm border-0 border-l-4 border-l-red-400">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-red-600">
            <AlertCircle size={18} />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions for this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-4">
            <div>
              <div className="text-sm font-medium text-foreground">Delete this invoice</div>
              <div className="text-xs text-muted-foreground">Once deleted, this invoice cannot be recovered.</div>
            </div>
            <form action={del}>
              <Button type="submit" variant="destructive" size="sm">
                <Trash2 size={14} /> Delete
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
