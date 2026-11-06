import Link from "next/link";
import { CalendarPlus, Users, Receipt, TrendingUp, Clock, FileText } from "lucide-react";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
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
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Users size={14} className="text-primary" />
              Active students
            </CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums">
              {Number(s.active_students)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              Upcoming classes
            </CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums">
              {Number(s.upcoming_count)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Receipt size={14} className="text-accent" />
              Outstanding
            </CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums">
              {currency(Number(s.outstanding), currencySymbol)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {revenueData.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp size={14} />
              Last 6 months
            </CardDescription>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} symbol={currencySymbol} />
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-primary" />
                Paid
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-accent/60" />
                Outstanding
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>Next 5 scheduled sessions</CardDescription>
            <CardAction>
              <Link href="/schedule">
                <Button variant="outline" size="sm">View all</Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState title="Nothing scheduled" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/classes/${c.id}`} className="font-medium hover:underline">
                          {fmtDateTime(c.scheduled_at)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.student_name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.duration_minutes} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs report</CardTitle>
            <CardDescription>Classes without post-class reports</CardDescription>
          </CardHeader>
          <CardContent>
            {needsReport.length === 0 ? (
              <EmptyState title="All caught up" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsReport.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/classes/${c.id}`} className="font-medium hover:underline">
                          {c.student_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmtDateTime(c.scheduled_at)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/30">
                          pending
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unpaid invoices</CardTitle>
          <CardDescription>Outstanding balances awaiting payment</CardDescription>
          <CardAction>
            <Link href="/invoices">
              <Button variant="outline" size="sm">View all</Button>
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {unpaid.length === 0 ? (
            <EmptyState title="Nothing outstanding" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaid.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{inv.student_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.issued_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currency(Number(inv.total_amount), currencySymbol)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={inv.status === "overdue" ? "destructive" : "outline"}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
