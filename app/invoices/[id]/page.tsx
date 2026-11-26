import { FormBusy } from "@/components/action-busy";
import { ConfirmAction } from "@/components/confirm-action";
import { requireAdminPage } from "@/lib/auth";
import { invoiceCalendarPeriod } from "@/lib/portal-context";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  User,
  ArrowLeft,
} from "lucide-react";
import { queryOne, queryAll, getSettings } from "@/lib/db";
import { setInvoiceStatus, deleteInvoice } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currency, fmtDate } from "@/lib/format";
import type { Invoice, InvoiceItem, Student, InvoiceStatus } from "@/lib/types";
import { PrintButton } from "@/components/print-button";
import { InvoiceDocument } from "@/components/invoice-document";
import { WhatsAppShare } from "@/components/whatsapp-share";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: {
  value: Exclude<InvoiceStatus, "canceled">;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "draft", label: "Draft", icon: <FileText size={14} aria-hidden="true" /> },
  { value: "sent", label: "Sent", icon: <Clock size={14} aria-hidden="true" /> },
  { value: "paid", label: "Paid", icon: <CheckCircle2 size={14} aria-hidden="true" /> },
  { value: "overdue", label: "Overdue", icon: <AlertCircle size={14} aria-hidden="true" /> },
];

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const inv = await queryOne<Invoice & { billing_month?: string | null }>(
    "SELECT id, student_id, invoice_number, period_start, period_end, total_amount, status, issued_at, paid_at, notes, billing_month FROM invoices WHERE id = ?",
    [id],
  );
  if (!inv) notFound();

  const [student, items, settings] = await Promise.all([
    queryOne<Student>(
      "SELECT id,name,email,phone,guardian_name,guardian_contact FROM students WHERE id=?",
      [inv.student_id],
    ),
    queryAll<InvoiceItem>(
      "SELECT id,invoice_id,class_id,description,quantity,unit_amount,amount FROM invoice_items WHERE invoice_id=? AND NOT (amount=0 AND description LIKE '[CANCELLED]%') ORDER BY id",
      [id],
    ),
    getSettings([
      "business_name",
      "business_contact",
      "payment_instructions",
      "currency",
      "duitnow_qr",
    ]),
  ]);
  if (!student) notFound();

  const currencySymbol = settings.currency || "RM";
  const period = invoiceCalendarPeriod(inv);
  const del = deleteInvoice.bind(null, id);

  const whatsappText = [
    `Invoice ${inv.invoice_number}`,
    `Student: ${student.name}`,
    `Period: ${fmtDate(period.start)} — ${fmtDate(period.end)}`,
    `Total: ${currency(Number(inv.total_amount), currencySymbol)}`,
    `Status: ${inv.status}`,
  ].join("\n");

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
              >
                <Link href="/invoices" aria-label="Back to invoices">
                  <ArrowLeft size={18} aria-hidden="true" />
                </Link>
              </Button>
              <span>{inv.invoice_number}</span>
            </div>
          }
          subtitle={`${student.name} · ${fmtDate(period.start)} — ${fmtDate(period.end)}`}
          action={
            <div className="flex flex-wrap gap-2">
              <WhatsAppShare text={whatsappText} />
              <PrintButton />
              <Button asChild variant="secondary">
                <Link href={`/students/${student.id}`}>
                  <User size={15} aria-hidden="true" /> Student
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      {/* Status Toggle (Cancel lives exclusively in Danger Zone with confirmation) */}
      <Card className="mb-6 no-print border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard size={18} className="text-primary" aria-hidden="true" />
            Invoice status
          </CardTitle>
          <CardDescription>
            {inv.status === "canceled"
              ? "This invoice is canceled. Select an active status to reopen it."
              : "Update the current payment status of this invoice."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-xl w-fit">
            {ACTIVE_STATUSES.map((s) => (
              <form
                key={s.value}
                action={setInvoiceStatus.bind(null, id, s.value)}
              >
                <FormBusy />
                <Button
                  type="submit"
                  variant={inv.status === s.value ? "default" : "ghost"}
                  size="sm"
                  className={
                    inv.status === s.value
                      ? "gap-1.5"
                      : "gap-1.5 text-muted-foreground"
                  }
                >
                  {s.icon}
                  {s.label}
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      <InvoiceDocument
        invoice={inv}
        student={student}
        items={items}
        businessName={settings.business_name}
        businessContact={settings.business_contact}
        paymentInstructions={settings.payment_instructions}
        currencySymbol={currencySymbol}
        duitnowQr={settings.duitnow_qr}
      />

      {inv.status !== "canceled" && (
        <Card className="no-print border border-destructive/30 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              Cancel invoice
            </CardTitle>
            <CardDescription>
              Canceling marks this invoice as void while preserving billing history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Canceled invoices are excluded from revenue totals.
              </p>
              <ConfirmAction
                action={del}
                label="Cancel invoice"
                message={`Invoice ${inv.invoice_number} will be marked canceled and excluded from revenue totals. History is preserved.`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
