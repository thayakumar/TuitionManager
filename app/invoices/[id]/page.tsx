import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db, getSetting } from "@/lib/db";
import { setInvoiceStatus, deleteInvoice } from "@/lib/actions";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { currency, fmtDate } from "@/lib/format";
import type { Invoice, InvoiceItem, Student, InvoiceStatus } from "@/lib/types";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue", "canceled"];

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const inv = db().prepare("SELECT * FROM invoices WHERE id = ?").get(id) as
    | Invoice
    | undefined;
  if (!inv) notFound();

  const student = db()
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(inv.student_id) as Student;

  const items = db()
    .prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id")
    .all(id) as InvoiceItem[];

  const businessName = getSetting("business_name");
  const businessContact = getSetting("business_contact");
  const paymentInstructions = getSetting("payment_instructions");

  const del = deleteInvoice.bind(null, id);

  return (
    <>
      <PageHeader
        title={inv.invoice_number}
        subtitle={`${student.name} · ${fmtDate(inv.period_start)} — ${fmtDate(inv.period_end)}`}
        action={
          <div className="flex gap-2">
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
              variant={inv.status === s ? "primary" : "secondary"}
              className="w-full justify-center"
            >
              {s}
            </Button>
          </form>
        ))}
      </div>

      <Card className="mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-lg font-semibold">{businessName}</div>
            {businessContact && (
              <div className="text-sm text-slate-500 whitespace-pre-line">{businessContact}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">INVOICE</div>
            <div className="text-sm text-slate-600 mt-1">{inv.invoice_number}</div>
            <div className="text-xs text-slate-500">Issued {fmtDate(inv.issued_at)}</div>
            <div className="mt-2">
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
        </div>

        <div className="mb-6">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bill to</div>
          <div className="text-sm font-medium">{student.name}</div>
          {student.guardian_name && (
            <div className="text-sm text-slate-600">c/o {student.guardian_name}</div>
          )}
          {(student.email || student.phone) && (
            <div className="text-sm text-slate-500">
              {student.email}
              {student.email && student.phone ? " · " : ""}
              {student.phone}
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="text-left py-2 font-medium text-slate-600">Description</th>
              <th className="text-right py-2 font-medium text-slate-600">Hours</th>
              <th className="text-right py-2 font-medium text-slate-600">Rate</th>
              <th className="text-right py-2 font-medium text-slate-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2">{it.description}</td>
                <td className="text-right py-2">{it.quantity.toFixed(2)}</td>
                <td className="text-right py-2">{it.unit_amount.toFixed(2)}</td>
                <td className="text-right py-2">{it.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right py-3 font-semibold">
                Total
              </td>
              <td className="text-right py-3 font-semibold text-lg">
                {currency(inv.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {inv.notes && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</div>
            <div className="text-sm whitespace-pre-wrap">{inv.notes}</div>
          </div>
        )}

        {paymentInstructions && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Payment instructions
            </div>
            <div className="text-sm whitespace-pre-wrap">{paymentInstructions}</div>
          </div>
        )}

        {inv.paid_at && (
          <div className="mt-6 text-center">
            <Badge tone="green">Paid {fmtDate(inv.paid_at)}</Badge>
          </div>
        )}
      </Card>

      <div className="flex justify-end no-print">
        <form action={del}>
          <Button type="submit" variant="danger">
            <Trash2 size={16} /> Delete invoice
          </Button>
        </form>
      </div>
    </>
  );
}
