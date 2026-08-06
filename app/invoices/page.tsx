import Link from "next/link";
import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, Card, Button, Badge, EmptyState } from "@/components/ui";
import { currency, fmtDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";

type InvoiceWithStudent = Invoice & { student_name: string };

export default function InvoicesPage() {
  const invoices = db()
    .prepare(
      `SELECT i.*, s.name AS student_name
       FROM invoices i JOIN students s ON s.id = i.student_id
       ORDER BY i.issued_at DESC`
    )
    .all() as InvoiceWithStudent[];

  const outstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "canceled")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const paidThisMonth = invoices
    .filter((i) => {
      if (i.status !== "paid" || !i.paid_at) return false;
      const paid = new Date(i.paid_at);
      const now = new Date();
      return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + i.total_amount, 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total`}
        action={
          <Link href="/invoices/new">
            <Button variant="primary">
              <Receipt size={16} /> Generate invoice
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs text-slate-500">Outstanding</div>
          <div className="text-2xl font-semibold mt-1">{currency(outstanding)}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Paid this month</div>
          <div className="text-2xl font-semibold mt-1">{currency(paidThisMonth)}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Total invoices</div>
          <div className="text-2xl font-semibold mt-1">{invoices.length}</div>
        </Card>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Generate an invoice from completed classes."
          action={
            <Link href="/invoices/new">
              <Button variant="primary">
                <Receipt size={16} /> Generate invoice
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`}>
              <Card className="hover:border-brand-500 py-3 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">
                      {inv.invoice_number} · {inv.student_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{currency(inv.total_amount)}</div>
                    <Badge
                      tone={
                        inv.status === "paid"
                          ? "green"
                          : inv.status === "overdue"
                            ? "red"
                            : inv.status === "sent"
                              ? "blue"
                              : "slate"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
