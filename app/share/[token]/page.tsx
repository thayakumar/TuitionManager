import { notFound } from "next/navigation";
import { queryOne, queryAll, getSetting } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currency, fmtDateTime, fmtDate } from "@/lib/format";
import type { Student, ClassRow, Invoice, Report } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParentSharePage({ params }: { params: { token: string } }) {
  const shareToken = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM share_tokens WHERE token = ? AND active = 1",
    [params.token]
  );
  if (!shareToken) notFound();

  const studentId = Number(shareToken.student_id);
  const currencySymbol = await getSetting("currency");
  const businessName = await getSetting("business_name");

  const [student, classes, invoices] = await Promise.all([
    queryOne<Student>("SELECT * FROM students WHERE id = ?", [studentId]),
    queryAll<ClassRow & { report_id: number | null; topics_covered: string | null; homework: string | null; performance: string | null; rating: number | null }>(
      `SELECT c.*, r.id as report_id, r.topics_covered, r.homework, r.performance, r.rating
       FROM classes c LEFT JOIN reports r ON r.class_id = c.id
       WHERE c.student_id = ?
       ORDER BY c.scheduled_at DESC LIMIT 50`,
      [studentId]
    ),
    queryAll<Invoice>(
      "SELECT * FROM invoices WHERE student_id = ? ORDER BY issued_at DESC LIMIT 20",
      [studentId]
    ),
  ]);

  if (!student) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{businessName}</div>
        <h1 className="text-2xl font-heading font-semibold text-foreground mt-1">{student.name}</h1>
        <p className="text-sm text-muted-foreground">
          {student.subject || "—"}{student.grade_level ? ` · ${student.grade_level}` : ""}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Class History</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes yet.</p>
        ) : (
          <div className="space-y-2">
            {classes.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex justify-between items-start">
                    <div className={c.status === "canceled" ? "line-through opacity-60" : ""}>
                      <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.duration_minutes} min · {c.subject || "Lesson"}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {c.attendance && (
                        <Badge variant={c.attendance === "present" ? "default" : c.attendance === "late" ? "outline" : "destructive"}>
                          {c.attendance}
                        </Badge>
                      )}
                      <Badge variant={c.status === "completed" ? "default" : c.status === "canceled" ? "destructive" : "secondary"}>
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                  {c.report_id && (
                    <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
                      {c.topics_covered && <div><span className="font-medium">Topics:</span> {c.topics_covered}</div>}
                      {c.homework && <div><span className="font-medium">Homework:</span> {c.homework}</div>}
                      {c.performance && <div><span className="font-medium">Performance:</span> {c.performance}</div>}
                      {c.rating && <div><span className="font-medium">Rating:</span> {c.rating}/5</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="pt-4 pb-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{currency(Number(inv.total_amount), currencySymbol)}</div>
                    <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}>
                      {inv.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="mt-12 text-center text-xs text-muted-foreground">
        Powered by {businessName} · Tuition Manager
      </div>
    </div>
  );
}
