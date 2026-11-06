import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { queryOne, queryAll, getSetting } from "@/lib/db";
import { setInvoiceStatus, deleteInvoice } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency, fmtDate } from "@/lib/format";
import type { Invoice, InvoiceItem, Student, InvoiceStatus } from "@/lib/types";
import PrintButton from "./PrintButton";
import { WhatsAppShare } from "@/components/whatsapp-share";

export const dynamic = "force-dynamic";

const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue", "canceled"];

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

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const inv = await queryOne<Invoice>("SELECT * FROM invoices WHERE id = ?", [id]);
  if (!inv) notFound();

  const [student, items, businessName, businessContact, paymentInstructions, currencySymbol, duitnowQr] =
    await Promise.all([
      queryOne<Student>("SELECT * FROM students WHERE id = ?", [inv.student_id]),
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
      <PageHeader
        title={inv.invoice_number}
        subtitle={`${student.name} · ${fmtDate(inv.period_start)} — ${fmtDate(inv.period_end)}`}
        action={
          <div className="flex gap-2">
            <WhatsAppShare text={whatsappText} />
            <PrintButton />
            <Link href={`/students/${student.id}`}>
              <Button variant="secondary">Student</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6 no-print">
        {STATUSES.map((s) => (
          <form key={s} action={setInvoiceStatus.bind(null, id, s)}>
            <Button
              type="submit"
              variant={inv.status === s ? "default" : "secondary"}
              className="w-full justify-center"
            >
              {s}
            </Button>
          </form>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-lg font-heading font-semibold">{businessName}</div>
              {businessContact && (
                <div className="text-sm text-muted-foreground whitespace-pre-line">{businessContact}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-heading font-bold">INVOICE</div>
              <div className="text-sm text-foreground/80 mt-1">{inv.invoice_number}</div>
              <div className="text-xs text-muted-foreground">Issued {fmtDate(inv.issued_at)}</div>
              <div className="mt-2">
                <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bill to</div>
            <div className="text-sm font-medium">{student.name}</div>
            {student.guardian_name && (
              <div className="text-sm text-foreground/80">c/o {student.guardian_name}</div>
            )}
            {(student.email || student.phone) && (
              <div className="text-sm text-muted-foreground">
                {student.email}
                {student.email && student.phone ? " · " : ""}
                {student.phone}
              </div>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Hours</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Rate</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const isCancelled = it.description.startsWith("[CANCELLED]");
                return (
                  <tr key={it.id} className={`border-b border-border/50 ${isCancelled ? "text-muted-foreground line-through" : ""}`}>
                    <td className="py-2">{it.description}</td>
                    <td className="text-right py-2">{Number(it.quantity).toFixed(2)}</td>
                    <td className="text-right py-2">{Number(it.unit_amount).toFixed(2)}</td>
                    <td className="text-right py-2">{Number(it.amount).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right py-3 font-semibold">
                  Total
                </td>
                <td className="text-right py-3 font-semibold text-lg">
                  {currency(Number(inv.total_amount), currencySymbol)}
                </td>
              </tr>
            </tfoot>
          </table>

          {inv.notes && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
              <div className="text-sm whitespace-pre-wrap">{inv.notes}</div>
            </div>
          )}

          {paymentInstructions && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Payment instructions
              </div>
              <div className="text-sm whitespace-pre-wrap">{paymentInstructions}</div>
            </div>
          )}

          {duitnowQr && (
            <div className="mt-6 pt-6 border-t border-border text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Pay via DuitNow
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={duitnowQr} alt="DuitNow QR" className="max-w-48 mx-auto" />
            </div>
          )}

          {inv.paid_at && (
            <div className="mt-6 text-center">
              <Badge variant="default">Paid {fmtDate(inv.paid_at)}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end no-print">
        <form action={del}>
          <Button type="submit" variant="destructive">
            <Trash2 size={16} /> Delete invoice
          </Button>
        </form>
      </div>
    </>
  );
}
