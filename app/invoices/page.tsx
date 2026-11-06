import Link from "next/link";
import { Receipt, DollarSign, TrendingUp, FileText } from "lucide-react";
import { queryAll, getSetting } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Outstanding</CardDescription>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-semibold">
              {currency(outstanding, currencySymbol)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Paid This Month</CardDescription>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-semibold">
              {currency(paidThisMonth, currencySymbol)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Collected revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-semibold">
              {invoices.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
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
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>
              A list of all invoices including status and amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.student_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currency(Number(inv.total_amount), currencySymbol)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
