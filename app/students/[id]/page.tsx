import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Receipt, Pencil, Trash2, Phone, Mail, UserCircle } from "lucide-react";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { addStudentNote, deleteStudentNote } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
        title={
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(student.name)}
              </AvatarFallback>
            </Avatar>
            <span>{student.name}</span>
          </div>
        }
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
          <CardHeader>
            <CardDescription>Contact</CardDescription>
            <CardTitle className="text-sm">{student.phone || "—"}</CardTitle>
          </CardHeader>
          {student.email && (
            <CardContent>
              <div className="text-sm text-muted-foreground">{student.email}</div>
            </CardContent>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Guardian</CardDescription>
            <CardTitle className="text-sm">{student.guardian_name || "—"}</CardTitle>
          </CardHeader>
          {student.guardian_contact && (
            <CardContent>
              <div className="text-sm text-muted-foreground">{student.guardian_contact}</div>
            </CardContent>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>
              <Badge variant={student.active ? "default" : "secondary"}>
                {student.active ? "Active" : "Inactive"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Since {fmtDate(student.created_at)}</div>
          </CardContent>
        </Card>
      </div>

      {student.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardDescription>Notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap">{student.notes}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>{upcoming.length} scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">None scheduled</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary hover:bg-muted/30">
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
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Past classes</CardTitle>
            <CardDescription>{past.length} recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No history yet</div>
            ) : (
              <div className="space-y-2">
                {past.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`} className="block">
                    <div className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary hover:bg-muted/30 ${c.status === "canceled" ? "opacity-60" : ""}`}>
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
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>{invoices.length} total</CardDescription>
          <CardAction>
            <Link href={`/invoices/new?student=${id}`}>
              <Button variant="secondary" size="sm">
                <Receipt size={14} /> Generate
              </Button>
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No invoices</div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
                  <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary hover:bg-muted/30">
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Running notes</CardTitle>
          <CardDescription>Session-by-session observations about this student</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addStudentNote.bind(null, id)} className="mb-4">
            <Textarea
              name="content"
              rows={2}
              required
              placeholder="Add a note about this student..."
              className="mb-2"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm">Add note</Button>
            </div>
          </form>
          {notes.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
              No notes yet
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
