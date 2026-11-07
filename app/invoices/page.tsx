import Link from "next/link";
import {
  Receipt, DollarSign, TrendingUp, FileText, Wallet,
  CheckCircle2, AlertCircle, Clock, CreditCard, ArrowRight,
} from "lucide-react";
import { queryAll, getSetting } from "@/lib/db";
import type { Student } from "@/lib/types";
import { GenerateInvoiceDialog } from "@/components/generate-invoice-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function statusIcon(status: string) {
  switch (status) {
    case "paid":
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case "overdue":
      return <AlertCircle size={14} className="text-red-500" />;
    case "sent":
      return <Clock size={14} className="text-blue-500" />;
    default:
      return <FileText size={14} className="text-gray-400" />;
  }
}

export default async function InvoicesPage() {
  const activeStudents = await queryAll<Student>(
    "SELECT id, name FROM students WHERE active = 1 ORDER BY name"
  );
  const studentOpts = activeStudents.map((s) => ({ id: s.id, name: s.name }));

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

  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const paidRatio = invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0;

  const draftCount = invoices.filter((i) => i.status === "draft").length;
  const sentCount = invoices.filter((i) => i.status === "sent").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const statCards = [
    {
      label: "Outstanding",
      value: currency(outstanding, currencySymbol),
      sub: `${invoices.filter((i) => ["draft", "sent", "overdue"].includes(i.status)).length} unpaid`,
      icon: Wallet,
      bg: "bg-rose-50",
      iconColor: "text-rose-500",
    },
    {
      label: "Paid This Month",
      value: currency(paidThisMonth, currencySymbol),
      sub: "Collected revenue",
      icon: TrendingUp,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      label: "Total Invoices",
      value: String(invoices.length),
      sub: "All time",
      icon: FileText,
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: "Collection Rate",
      value: `${paidRatio}%`,
      sub: `${paidCount} of ${invoices.length} paid`,
      icon: CreditCard,
      bg: "bg-violet-50",
      iconColor: "text-violet-500",
    },
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total · ${currency(outstanding, currencySymbol)} outstanding`}
        action={
          <div className="flex gap-2">
            <ExportButton getData={exportInvoicesCsv} filename="invoices.csv" />
            <GenerateInvoiceDialog students={studentOpts} />
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <Card key={card.label} className="shadow-sm border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                </div>
                <div className={`flex size-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon size={20} className={card.iconColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="px-3 py-1 cursor-pointer">
            All ({invoices.length})
          </Badge>
          {draftCount > 0 && (
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-secondary">
              <FileText size={12} className="mr-1" /> Draft ({draftCount})
            </Badge>
          )}
          {sentCount > 0 && (
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-secondary">
              <Clock size={12} className="mr-1 text-blue-500" /> Sent ({sentCount})
            </Badge>
          )}
          {paidCount > 0 && (
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-secondary">
              <CheckCircle2 size={12} className="mr-1 text-emerald-500" /> Paid ({paidCount})
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-secondary">
              <AlertCircle size={12} className="mr-1 text-red-500" /> Overdue ({overdueCount})
            </Badge>
          )}
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Generate an invoice from completed classes."
          action={<GenerateInvoiceDialog students={studentOpts} />}
        />
      ) : (
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt size={18} className="text-indigo-500" />
                  All Invoices
                </CardTitle>
                <CardDescription>
                  Manage and track all your invoices
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Period</TableHead>
                  <TableHead className="hidden sm:table-cell">Issued</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer group">
                    <TableCell>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{inv.student_name}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {fmtDate(inv.issued_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-base font-bold text-foreground">
                        {currency(Number(inv.total_amount), currencySymbol)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {statusIcon(inv.status)}
                        <Badge variant={statusVariant(inv.status)} className="capitalize">
                          {inv.status}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
