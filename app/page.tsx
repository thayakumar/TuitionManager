import Link from "next/link";
import { CalendarPlus, Users, Receipt } from "lucide-react";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency, fmtDateTime } from "@/lib/format";
import { RevenueChart } from "@/components/revenue-chart";
import type { ClassWithStudent, Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const nowISO = new Date().toISOString();
  const currencySymbol = await getSetting("currency");

  const [upcoming, needsReport, unpaid, stats, revenueRaw] = await Promise.all([
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at >= ? AND c.status = 'scheduled'
       ORDER BY c.scheduled_at LIMIT 5`,
      [nowISO]
    ),
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c
       JOIN students s ON s.id = c.student_id
       LEFT JOIN reports r ON r.class_id = c.id
       WHERE c.scheduled_at < ? AND c.status != 'canceled' AND r.id IS NULL
       ORDER BY c.scheduled_at DESC LIMIT 5`,
      [nowISO]
    ),
    queryAll<Invoice & { student_name: string }>(
      `SELECT i.*, s.name AS student_name
       FROM invoices i JOIN students s ON s.id = i.student_id
       WHERE i.status IN ('draft','sent','overdue')
       ORDER BY i.issued_at DESC LIMIT 5`
    ),
    queryOne<{ active_students: number; upcoming_count: number; outstanding: number }>(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE active = 1) AS active_students,
         (SELECT COUNT(*) FROM classes WHERE scheduled_at >= ? AND status = 'scheduled') AS upcoming_count,
         (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE status IN ('draft','sent','overdue')) AS outstanding`,
      [nowISO]
    ),
    queryAll<{ month: string; paid: number; outstanding: number }>(
      `SELECT strftime('%Y-%m', issued_at) as month,
              SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid,
              SUM(CASE WHEN status IN ('draft','sent','overdue') THEN total_amount ELSE 0 END) as outstanding
       FROM invoices
       WHERE issued_at >= date('now', '-6 months')
       GROUP BY month ORDER BY month`
    ),
  ]);

  const s = stats ?? { active_students: 0, upcoming_count: 0, outstanding: 0 };
  const revenueData = revenueRaw.map((r) => ({
    month: r.month,
    paid: Number(r.paid),
    outstanding: Number(r.outstanding),
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your tutoring practice"
        action={
          <Link href="/schedule/new">
            <Button>
              <CalendarPlus size={16} /> Schedule class
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Users className="text-primary" size={24} />
            <div>
              <div className="text-xs text-muted-foreground">Active students</div>
              <div className="text-2xl font-heading font-semibold">{Number(s.active_students)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <CalendarPlus className="text-emerald-600" size={24} />
            <div>
              <div className="text-xs text-muted-foreground">Upcoming classes</div>
              <div className="text-2xl font-heading font-semibold">{Number(s.upcoming_count)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Receipt className="text-accent" size={24} />
            <div>
              <div className="text-xs text-muted-foreground">Outstanding</div>
              <div className="text-2xl font-heading font-semibold">{currency(Number(s.outstanding), currencySymbol)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {revenueData.length > 0 && (
        <Card className="mb-8">
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Revenue (last 6 months)</h2>
            <RevenueChart data={revenueData} symbol={currencySymbol} />
            <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-primary" /> Paid</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-accent/60" /> Outstanding</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-foreground">Next 5 classes</h2>
            <Link href="/schedule" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled" />
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className="hover:border-primary py-3 mb-2 cursor-pointer transition">
                    <CardContent className="py-0">
                      <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                      <div className="text-xs text-muted-foreground">{c.student_name} · {c.duration_minutes} min</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-foreground">Needs report</h2>
          </div>
          {needsReport.length === 0 ? (
            <EmptyState title="All caught up" />
          ) : (
            <div className="space-y-2">
              {needsReport.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}>
                  <Card className="hover:border-primary py-3 mb-2 border-accent/50 cursor-pointer transition">
                    <CardContent className="py-0 flex justify-between">
                      <div>
                        <div className="text-sm font-medium">{c.student_name}</div>
                        <div className="text-xs text-muted-foreground">{fmtDateTime(c.scheduled_at)}</div>
                      </div>
                      <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/30">pending</Badge>
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
          <h2 className="text-sm font-semibold text-foreground">Unpaid invoices</h2>
          <Link href="/invoices" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {unpaid.length === 0 ? (
          <EmptyState title="Nothing outstanding" />
        ) : (
          <div className="space-y-2">
            {unpaid.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className="hover:border-primary py-3 mb-2 cursor-pointer transition">
                  <CardContent className="py-0 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{inv.invoice_number} · {inv.student_name}</div>
                      <div className="text-xs text-muted-foreground">Issued {new Date(inv.issued_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{currency(Number(inv.total_amount), currencySymbol)}</div>
                      <Badge variant={inv.status === "overdue" ? "destructive" : "outline"}>
                        {inv.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
