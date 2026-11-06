import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
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

      <Card className="mb-6 no-print">
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Update the invoice status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <form key={s} action={setInvoiceStatus.bind(null, id, s)}>
                <Button
                  type="submit"
                  variant={inv.status === s ? "default" : "secondary"}
                  className="capitalize"
                >
                  {s}
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-lg font-heading font-semibold">{businessName}</div>
              {businessContact && (
                <div className="text-sm text-muted-foreground whitespace-pre-line">{businessContact}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-heading font-bold tracking-tight">INVOICE</div>
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const isCancelled = it.description.startsWith("[CANCELLED]");
                return (
                  <TableRow key={it.id} className={isCancelled ? "text-muted-foreground line-through" : ""}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell className="text-right">{Number(it.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(it.unit_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(it.amount).toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex justify-end border-t pt-3 mt-1">
            <div className="text-right">
              <span className="text-sm font-medium text-muted-foreground mr-4">Total</span>
              <span className="text-lg font-semibold">{currency(Number(inv.total_amount), currencySymbol)}</span>
            </div>
          </div>

          {inv.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                <div className="text-sm whitespace-pre-wrap">{inv.notes}</div>
              </div>
            </>
          )}

          {paymentInstructions && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Payment instructions
                </div>
                <div className="text-sm whitespace-pre-wrap">{paymentInstructions}</div>
              </div>
            </>
          )}

          {duitnowQr && (
            <>
              <Separator className="my-6" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Pay via DuitNow
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={duitnowQr} alt="DuitNow QR" className="max-w-48 mx-auto" />
              </div>
            </>
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
