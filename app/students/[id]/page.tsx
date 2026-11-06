import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Receipt, Pencil, Trash2 } from "lucide-react";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { addStudentNote, deleteStudentNote } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareTokenButton } from "@/components/share-token-button";
import { currency, fmtDateTime, fmtDate } from "@/lib/format";
import type { Student, ClassRow, Invoice, StudentNote } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  switch (status) {
    case "paid":
    case "completed":
      return "default" as const;
    case "overdue":
    case "canceled":
      return "destructive" as const;
    case "sent":
    case "scheduled":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [student, currencySymbol] = await Promise.all([
    queryOne<Student>("SELECT * FROM students WHERE id = ?", [id]),
    getSetting("currency"),
  ]);
  if (!student) notFound();

  const [upcoming, past, invoices, notes, shareTokenRow] = await Promise.all([
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? AND status = 'scheduled' ORDER BY scheduled_at LIMIT 10",
      [id]
    ),
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? AND status != 'scheduled' ORDER BY scheduled_at DESC LIMIT 10",
      [id]
    ),
    queryAll<Invoice>(
      "SELECT * FROM invoices WHERE student_id = ? ORDER BY issued_at DESC LIMIT 10",
      [id]
    ),
    queryAll<StudentNote>(
      "SELECT * FROM student_notes WHERE student_id = ? ORDER BY created_at DESC LIMIT 20",
      [id]
    ),
    queryOne<{ token: string }>(
      "SELECT token FROM share_tokens WHERE student_id = ? AND active = 1 ORDER BY id DESC LIMIT 1",
      [id]
    ),
  ]);

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={`${student.subject || "—"}${student.grade_level ? " · " + student.grade_level : ""} · ${currency(Number(student.hourly_rate), currencySymbol)}/hr`}
        action={
          <div className="flex flex-wrap gap-2">
            <ShareTokenButton studentId={id} existingToken={shareTokenRow?.token ?? null} />
            <Link href={`/students/${id}/edit`}>
              <Button variant="secondary">
                <Pencil size={16} /> Edit
              </Button>
            </Link>
            <Link href={`/schedule/new?student=${id}`}>
              <Button>
                <CalendarPlus size={16} /> Schedule class
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-1">Contact</div>
            <div className="text-sm">{student.phone || "—"}</div>
            <div className="text-sm text-muted-foreground">{student.email || ""}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-1">Guardian</div>
            <div className="text-sm">{student.guardian_name || "—"}</div>
            <div className="text-sm text-muted-foreground">{student.guardian_contact || ""}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Badge variant={student.active ? "default" : "secondary"}>
              {student.active ? "Active" : "Inactive"}
            </Badge>
            <div className="text-xs text-muted-foreground/70 mt-2">Since {fmtDate(student.created_at)}</div>
          </CardContent>
        </Card>
      </div>

      {student.notes && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-1">Notes</div>
            <div className="text-sm whitespace-pre-wrap">{student.notes}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Upcoming classes</h2>
          {upcoming.length === 0 ? (
            <EmptyState title="None scheduled" />
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className="hover:border-primary py-3 mb-2 cursor-pointer transition">
                    <CardContent className="py-0 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.duration_minutes} min · {c.subject || student.subject || "Lesson"}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {c.is_trial ? <Badge variant="outline" className="text-accent border-accent/40">TRIAL</Badge> : null}
                        <Badge variant="secondary">scheduled</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Past classes</h2>
          {past.length === 0 ? (
            <EmptyState title="No history yet" />
          ) : (
            <div className="space-y-2">
              {past.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className={`hover:border-primary py-3 mb-2 cursor-pointer transition ${c.status === "canceled" ? "opacity-60" : ""}`}>
                    <CardContent className="py-0 flex justify-between items-center">
                      <div>
                        <div className={`text-sm font-medium ${c.status === "canceled" ? "line-through" : ""}`}>{fmtDateTime(c.scheduled_at)}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.duration_minutes} min · {c.attendance || "—"}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {c.is_trial ? <Badge variant="outline" className="text-accent border-accent/40">TRIAL</Badge> : null}
                        <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-foreground">Invoices</h2>
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
                <Card className="hover:border-primary py-3 mb-2 cursor-pointer transition">
                  <CardContent className="py-0 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{inv.invoice_number}</div>
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
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Running notes</h2>
        <Card className="mb-3">
          <CardContent className="pt-5">
            <form action={addStudentNote.bind(null, id)}>
              <textarea
                name="content"
                rows={2}
                required
                placeholder="Add a note about this student..."
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm mb-2"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm">Add note</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        {notes.length === 0 ? (
          <EmptyState title="No notes yet" />
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <Card key={n.id} className="py-2">
                <CardContent className="py-0 flex justify-between items-start gap-2">
                  <div>
                    <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  <form action={deleteStudentNote.bind(null, n.id, id)}>
                    <Button type="submit" variant="ghost" size="icon-sm" title="Delete note">
                      <Trash2 size={14} />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
