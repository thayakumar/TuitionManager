import { requireParent, invoiceCalendarPeriod } from "@/lib/portal-context";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { queryOne, queryAll, getSettings } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import type { Invoice, InvoiceItem } from "@/lib/types";
import { PrintButton } from "@/components/print-button";
import { InvoiceDocument } from "@/components/invoice-document";

export const dynamic = "force-dynamic";

export default async function ParentInvoiceDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string; invoiceId: string }>;
}) {
  const params = await paramsPromise;
  const parentStudent = await requireParent(params.token);

  const invoiceId = Number(params.invoiceId);
  if (!Number.isSafeInteger(invoiceId) || invoiceId < 1) notFound();
  const inv = await queryOne<Invoice & { billing_month?: string | null }>(
    "SELECT id, student_id, invoice_number, period_start, period_end, total_amount, status, issued_at, paid_at, notes, billing_month FROM invoices WHERE id = ? AND student_id = ? AND status<>'draft'",
    [invoiceId, parentStudent.id],
  );
  if (!inv) notFound();

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

  const period = invoiceCalendarPeriod(inv);

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
                <Link
                  href={`/share/${params.token}/invoices`}
                  aria-label="Back to invoices"
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                </Link>
              </Button>
              <span>{inv.invoice_number}</span>
            </div>
          }
          subtitle={`${fmtDate(period.start)} — ${fmtDate(period.end)}`}
          action={<PrintButton />}
        />
      </div>

      <InvoiceDocument
        invoice={inv}
        student={parentStudent}
        items={items}
        businessName={settings.business_name}
        businessContact={settings.business_contact}
        paymentInstructions={settings.payment_instructions}
        currencySymbol={settings.currency || "RM"}
        duitnowQr={settings.duitnow_qr}
      />
    </>
  );
}
