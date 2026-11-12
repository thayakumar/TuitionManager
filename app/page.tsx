import Link from "next/link";
import {
  CalendarPlus, Users, Clock, Receipt, TrendingUp, TrendingDown,
  FileText, BookOpen, GraduationCap, ArrowRight, CheckCircle2,
  AlertCircle, Calendar, Wallet, BarChart3, Activity,
} from "lucide-react";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { DashboardQuickActions, DashboardScheduleEmpty } from "@/components/dashboard-actions";
import type { Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { currency, fmtDateTime, fmtDate, fmtTime } from "@/lib/format";
import { RevenueChart } from "@/components/revenue-chart";
import { AttendanceChart } from "@/components/attendance-chart";
import type { ClassWithStudent, Invoice } from "@/lib/types";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const nowISO = now.toISOString();
  const todayLocal = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const currencySymbol = await getSetting("currency");
  const businessName = await getSetting("business_name");

  const activeStudents = await queryAll<Student>(
    "SELECT id, name, subject FROM students WHERE active = 1 ORDER BY name"
  );
  const studentOpts = activeStudents.map((s) => ({ id: s.id, name: s.name, subject: s.subject }));

  const [
    upcoming, needsReport, unpaid, stats, revenueRaw, todayClasses, attendanceStats, recentActivity,
  ] = await Promise.all([
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at >= ? AND c.status = 'scheduled'
       ORDER BY c.scheduled_at LIMIT 5`,
      [nowISO]
    ),
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
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
    queryOne<{
      active_students: number;
      upcoming_count: number;
      outstanding: number;
      month_classes: number;
      month_hours: number;
      month_revenue: number;
      completed_classes: number;
      total_classes: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE active = 1) AS active_students,
         (SELECT COUNT(*) FROM classes WHERE scheduled_at >= ? AND status = 'scheduled') AS upcoming_count,
         (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE status IN ('draft','sent','overdue')) AS outstanding,
         (SELECT COUNT(*) FROM classes WHERE scheduled_at >= date('now', 'start of month')) AS month_classes,
         (SELECT COALESCE(SUM(duration_minutes),0) FROM classes WHERE status = 'completed' AND scheduled_at >= date('now', 'start of month')) AS month_hours,
         (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE status = 'paid' AND paid_at >= date('now', 'start of month')) AS month_revenue,
         (SELECT COUNT(*) FROM classes WHERE status = 'completed') AS completed_classes,
         (SELECT COUNT(*) FROM classes) AS total_classes`,
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
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE date(c.scheduled_at) = ?
       ORDER BY c.scheduled_at`,
      [todayLocal]
    ),
    queryOne<{ present: number; late: number; absent: number; total: number }>(
      `SELECT
         COUNT(CASE WHEN attendance = 'present' THEN 1 END) as present,
         COUNT(CASE WHEN attendance = 'late' THEN 1 END) as late,
         COUNT(CASE WHEN attendance = 'absent' THEN 1 END) as absent,
         COUNT(*) as total
       FROM classes
       WHERE scheduled_at >= date('now', '-30 days') AND status = 'completed'`
    ),
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.status IN ('completed', 'canceled')
       ORDER BY c.scheduled_at DESC LIMIT 6`
    ),
  ]);

  const s = stats ?? {
    active_students: 0, upcoming_count: 0, outstanding: 0,
    month_classes: 0, month_hours: 0, month_revenue: 0,
    completed_classes: 0, total_classes: 0,
  };
  const att = attendanceStats ?? { present: 0, late: 0, absent: 0, total: 0 };
  const revenueData = revenueRaw.map((r) => ({
    month: r.month, paid: Number(r.paid), outstanding: Number(r.outstanding),
  }));

  const statCards = [
    {
      label: "Total Students",
      value: Number(s.active_students),
      icon: Users,
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
      trend: null,
    },
    {
      label: "Classes This Month",
      value: Number(s.month_classes),
      icon: Calendar,
      bg: "bg-amber-50",
      iconColor: "text-amber-500",
      trend: null,
    },
    {
      label: "Teaching Hours",
      value: `${Math.round(Number(s.month_hours) / 60)}h`,
      icon: Clock,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      trend: null,
    },
    {
      label: "Monthly Revenue",
      value: currency(Number(s.month_revenue), currencySymbol),
      icon: Wallet,
      bg: "bg-violet-50",
      iconColor: "text-violet-500",
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
        <div className="absolute right-16 bottom-0 size-24 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold">{greeting}!</h1>
          <p className="mt-1 text-sm text-white/80">
            {format(now, "EEEE, MMMM d, yyyy")} &middot; {businessName}
          </p>
          <DashboardQuickActions students={studentOpts} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="shadow-sm border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">{card.value}</p>
                </div>
                <div className={`flex size-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon size={20} className={card.iconColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid: Charts + Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-500" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </div>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  View All <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} symbol={currencySymbol} />
          </CardContent>
        </Card>

        {/* Today's Agenda */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity size={18} className="text-emerald-500" />
                Today&apos;s Agenda
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {todayClasses.length} class{todayClasses.length !== 1 ? "es" : ""}
              </Badge>
            </div>
            <CardDescription>{format(now, "EEEE, MMM d")}</CardDescription>
          </CardHeader>
          <CardContent>
            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No classes today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}?from=dashboard`}>
                    <div className="flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-secondary/50 hover:shadow-sm">
                      <div className="min-w-[52px] text-center">
                        <div className="text-xs font-semibold text-foreground">
                          {fmtTime(c.scheduled_at)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.duration_minutes}m
                        </div>
                      </div>
                      <Separator orientation="vertical" className="h-10" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{c.student_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.subject || "Lesson"}
                        </div>
                      </div>
                      <Badge
                        variant={c.status === "completed" ? "default" : c.status === "canceled" ? "destructive" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Donut */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-indigo-500" />
              Attendance
            </CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={att} />
          </CardContent>
        </Card>

        {/* Upcoming Classes */}
        <Card className="lg:col-span-2 shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen size={18} className="text-amber-500" />
                  Upcoming Classes
                </CardTitle>
                <CardDescription>Next scheduled sessions</CardDescription>
              </div>
              <Link href="/schedule">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  View All <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nothing scheduled</p>
                <DashboardScheduleEmpty students={studentOpts} />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Subject</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/classes/${c.id}?from=dashboard`} className="font-medium text-primary hover:underline">
                          {fmtDateTime(c.scheduled_at)}
                        </Link>
                      </TableCell>
                      <TableCell>{c.student_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{c.subject || "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.duration_minutes}m</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Needs Report + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={18} className="text-rose-500" />
                  Needs Report
                </CardTitle>
                <CardDescription>Classes awaiting post-class reports</CardDescription>
              </div>
              {needsReport.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {needsReport.length} pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {needsReport.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {needsReport.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}?from=dashboard`}>
                    <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-all hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                          <AlertCircle size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{c.student_name}</div>
                          <div className="text-xs text-muted-foreground">{fmtDateTime(c.scheduled_at)}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">pending</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity size={18} className="text-violet-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest class activity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}?from=dashboard`}>
                    <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-all hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`flex size-8 items-center justify-center rounded-lg ${
                          c.status === "completed" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                        }`}>
                          {c.status === "completed" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{c.student_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.subject || "Lesson"} &middot; {c.duration_minutes}m
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={c.status === "completed" ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {c.status}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {fmtDate(c.scheduled_at)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Invoices */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt size={18} className="text-amber-500" />
                Unpaid Invoices
              </CardTitle>
              <CardDescription>
                Outstanding: {currency(Number(s.outstanding), currencySymbol)}
              </CardDescription>
            </div>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {unpaid.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nothing outstanding</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Issued</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaid.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.student_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
