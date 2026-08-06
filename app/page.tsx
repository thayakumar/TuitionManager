import Link from "next/link";
import { CalendarPlus, Users, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, Card, Button, Badge, EmptyState } from "@/components/ui";
import { currency, fmtDateTime } from "@/lib/format";
import type { ClassWithStudent, Invoice, Report } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const nowISO = new Date().toISOString();

  const upcoming = db()
    .prepare(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at >= ? AND c.status = 'scheduled'
       ORDER BY c.scheduled_at LIMIT 5`
    )
    .all(nowISO) as ClassWithStudent[];

  const needsReport = db()
    .prepare(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c
       JOIN students s ON s.id = c.student_id
       LEFT JOIN reports r ON r.class_id = c.id
       WHERE c.scheduled_at < ? AND c.status != 'canceled' AND r.id IS NULL
       ORDER BY c.scheduled_at DESC LIMIT 5`
    )
    .all(nowISO) as ClassWithStudent[];

  const unpaid = db()
    .prepare(
      `SELECT i.*, s.name AS student_name
       FROM invoices i JOIN students s ON s.id = i.student_id
       WHERE i.status IN ('draft','sent','overdue')
       ORDER BY i.issued_at DESC LIMIT 5`
    )
    .all() as Array<Invoice & { student_name: string }>;

  const stats = db()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE active = 1) AS active_students,
         (SELECT COUNT(*) FROM classes WHERE scheduled_at >= ? AND status = 'scheduled') AS upcoming_count,
         (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE status IN ('draft','sent','overdue')) AS outstanding`
    )
    .get(nowISO) as { active_students: number; upcoming_count: number; outstanding: number };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your tutoring practice"
        action={
          <Link href="/schedule/new">
            <Button variant="primary">
              <CalendarPlus size={16} /> Schedule class
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <Users className="text-brand-600" size={24} />
            <div>
              <div className="text-xs text-slate-500">Active students</div>
              <div className="text-2xl font-semibold">{stats.active_students}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <CalendarPlus className="text-emerald-600" size={24} />
            <div>
              <div className="text-xs text-slate-500">Upcoming classes</div>
              <div className="text-2xl font-semibold">{stats.upcoming_count}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Receipt className="text-amber-600" size={24} />
            <div>
              <div className="text-xs text-slate-500">Outstanding</div>
              <div className="text-2xl font-semibold">{currency(stats.outstanding)}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Next 5 classes</h2>
            <Link href="/schedule" className="text-xs text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled" />
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className="hover:border-brand-500 py-3 mb-2">
                    <div className="text-sm font-medium">
                      {fmtDateTime(c.scheduled_at)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.student_name} · {c.duration_minutes} min
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Needs report</h2>
          </div>
          {needsReport.length === 0 ? (
            <EmptyState title="All caught up" />
          ) : (
            <div className="space-y-2">
              {needsReport.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className="hover:border-brand-500 py-3 mb-2 border-amber-200">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-sm font-medium">{c.student_name}</div>
                        <div className="text-xs text-slate-500">
                          {fmtDateTime(c.scheduled_at)}
                        </div>
                      </div>
                      <Badge tone="yellow">pending</Badge>
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
          <h2 className="text-sm font-semibold text-slate-700">Unpaid invoices</h2>
          <Link href="/invoices" className="text-xs text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {unpaid.length === 0 ? (
          <EmptyState title="Nothing outstanding" />
        ) : (
          <div className="space-y-2">
            {unpaid.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className="hover:border-brand-500 py-3 mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">
                        {inv.invoice_number} · {inv.student_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Issued {new Date(inv.issued_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {currency(inv.total_amount)}
                      </div>
                      <Badge
                        tone={inv.status === "overdue" ? "red" : inv.status === "sent" ? "blue" : "slate"}
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
