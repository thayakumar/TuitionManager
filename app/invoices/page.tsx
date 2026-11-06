import Link from "next/link";
import { Receipt } from "lucide-react";
import { queryAll, getSetting } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency, fmtDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { ExportButton } from "@/components/export-button";
import { exportInvoicesCsv } from "@/lib/export";

export const dynamic = "force-dynamic";

type InvoiceWithStudent = Invoice & { student_name: string };

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

export default async function InvoicesPage() {
  const [invoices, currencySymbol] = await Promise.all([
    queryAll<InvoiceWithStudent>(
      `SELECT i.*, s.name AS student_name
       FROM invoices i JOIN students s ON s.id = i.student_id
       ORDER BY i.issued_at DESC`
    ),
    getSetting("currency"),
  ]);

  const outstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "canceled")
    .reduce((sum, i) => sum + Number(i.total_amount), 0);

  const paidThisMonth = invoices
    .filter((i) => {
      if (i.status !== "paid" || !i.paid_at) return false;
      const paid = new Date(i.paid_at);
      const now = new Date();
      return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total`}
        action={
          <div className="flex gap-2">
            <ExportButton getData={exportInvoicesCsv} filename="invoices.csv" />
            <Link href="/invoices/new">
              <Button>
                <Receipt size={16} /> Generate invoice
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <div className="text-2xl font-heading font-semibold mt-1">{currency(outstanding, currencySymbol)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Paid this month</div>
            <div className="text-2xl font-heading font-semibold mt-1">{currency(paidThisMonth, currencySymbol)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">Total invoices</div>
            <div className="text-2xl font-heading font-semibold mt-1">{invoices.length}</div>
          </CardContent>
        </Card>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Generate an invoice from completed classes."
          action={
            <Link href="/invoices/new">
              <Button>
                <Receipt size={16} /> Generate invoice
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`}>
              <Card className="hover:border-primary py-3 mb-2 cursor-pointer transition">
                <CardContent className="py-0 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">
                      {inv.invoice_number} · {inv.student_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{currency(Number(inv.total_amount), currencySymbol)}</div>
                    <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
