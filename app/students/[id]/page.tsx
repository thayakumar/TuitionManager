import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Receipt, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, Card, Badge, Button, EmptyState } from "@/components/ui";
import { currency, fmtDateTime, fmtDate } from "@/lib/format";
import type { Student, ClassRow, Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const student = db().prepare("SELECT * FROM students WHERE id = ?").get(id) as
    | Student
    | undefined;
  if (!student) notFound();

  const upcoming = db()
    .prepare(
      "SELECT * FROM classes WHERE student_id = ? AND status = 'scheduled' ORDER BY scheduled_at LIMIT 10"
    )
    .all(id) as ClassRow[];

  const past = db()
    .prepare(
      "SELECT * FROM classes WHERE student_id = ? AND status != 'scheduled' ORDER BY scheduled_at DESC LIMIT 10"
    )
    .all(id) as ClassRow[];

  const invoices = db()
    .prepare("SELECT * FROM invoices WHERE student_id = ? ORDER BY issued_at DESC LIMIT 10")
    .all(id) as Invoice[];

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={`${student.subject || "—"}${student.grade_level ? " · " + student.grade_level : ""} · ${currency(student.hourly_rate)}/hr`}
        action={
          <div className="flex gap-2">
            <Link href={`/students/${id}/edit`}>
              <Button variant="secondary">
                <Pencil size={16} /> Edit
              </Button>
            </Link>
            <Link href={`/schedule/new?student=${id}`}>
              <Button variant="primary">
                <CalendarPlus size={16} /> Schedule class
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs text-slate-500 mb-1">Contact</div>
          <div className="text-sm">{student.phone || "—"}</div>
          <div className="text-sm text-slate-500">{student.email || ""}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 mb-1">Guardian</div>
          <div className="text-sm">{student.guardian_name || "—"}</div>
          <div className="text-sm text-slate-500">{student.guardian_contact || ""}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 mb-1">Status</div>
          <Badge tone={student.active ? "green" : "slate"}>
            {student.active ? "Active" : "Inactive"}
          </Badge>
          <div className="text-xs text-slate-400 mt-2">Since {fmtDate(student.created_at)}</div>
        </Card>
      </div>

      {student.notes && (
        <Card className="mb-6">
          <div className="text-xs text-slate-500 mb-1">Notes</div>
          <div className="text-sm whitespace-pre-wrap">{student.notes}</div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Upcoming classes</h2>
          {upcoming.length === 0 ? (
            <div className="text-sm text-slate-400 border border-dashed rounded-lg p-6 text-center">
              None scheduled
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className="hover:border-brand-500 py-3 mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                        <div className="text-xs text-slate-500">
                          {c.duration_minutes} min · {c.subject || student.subject || "Lesson"}
                        </div>
                      </div>
                      <Badge tone="blue">scheduled</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Past classes</h2>
          {past.length === 0 ? (
            <div className="text-sm text-slate-400 border border-dashed rounded-lg p-6 text-center">
              No history yet
            </div>
          ) : (
            <div className="space-y-2">
              {past.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className="hover:border-brand-500 py-3 mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                        <div className="text-xs text-slate-500">
                          {c.duration_minutes} min · {c.attendance || "—"}
                        </div>
                      </div>
                      <Badge tone={c.status === "canceled" ? "red" : "green"}>{c.status}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Invoices</h2>
          <Link href={`/invoices/new?student=${id}`}>
            <Button variant="secondary">
              <Receipt size={16} /> Generate invoice
            </Button>
          </Link>
        </div>
        {invoices.length === 0 ? (
          <EmptyState title="No invoices" />
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className="hover:border-brand-500 py-3 mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{inv.invoice_number}</div>
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
      </section>
    </>
  );
}
