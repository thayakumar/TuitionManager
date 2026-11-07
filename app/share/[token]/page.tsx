import { notFound } from "next/navigation";
import {
  Calendar, CheckCircle2, Clock, XCircle,
  TrendingUp, Receipt, BookOpen, Video,
} from "lucide-react";
import Link from "next/link";
import { queryOne, queryAll, getSetting } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency, fmtDateTime } from "@/lib/format";
import type { Student, ClassRow, Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParentDashboard({ params }: { params: { token: string } }) {
  const shareToken = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM share_tokens WHERE token = ? AND active = 1",
    [params.token]
  );
  if (!shareToken) notFound();

  const studentId = shareToken.student_id;
  const currencySymbol = await getSetting("currency");

  const [student, upcoming, stats, recentInvoices] = await Promise.all([
    queryOne<Student>("SELECT * FROM students WHERE id = ?", [studentId]),
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? AND status = 'scheduled' ORDER BY scheduled_at LIMIT 5",
      [studentId]
    ),
    queryOne<{ total: number; completed: number; present: number; late: number; absent: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN attendance = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN attendance = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN attendance = 'absent' THEN 1 ELSE 0 END) as absent
       FROM classes WHERE student_id = ?`,
      [studentId]
    ),
    queryAll<Invoice>(
      "SELECT * FROM invoices WHERE student_id = ? ORDER BY issued_at DESC LIMIT 3",
      [studentId]
    ),
  ]);

  if (!student) notFound();

  const attendanceRate = stats && stats.completed > 0
    ? Math.round(((stats.present + stats.late) / stats.completed) * 100)
    : 0;

  return (
    <>
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg mb-6">
        <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-0 size-20 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-xl font-bold">
            Welcome{student.guardian_name ? `, ${student.guardian_name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-sm text-white/80 mt-1">
            Here's an overview of {student.name}'s progress
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {student.subject && (
              <Badge className="bg-white/20 text-white border-white/30">{student.subject}</Badge>
            )}
            {student.grade_level && (
              <Badge className="bg-white/20 text-white border-white/30">{student.grade_level}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats?.completed ?? 0} completed
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50">
                <BookOpen size={20} className="text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats?.present ?? 0} present · {stats?.late ?? 0} late
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{upcoming.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  classes scheduled
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
                <Calendar size={20} className="text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Classes */}
      <Card className="shadow-sm border-0 mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" />
              Upcoming Classes
            </CardTitle>
            <Link href={`/share/${params.token}/schedule`}>
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No upcoming classes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50">
                    <Clock size={16} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{fmtDateTime(c.scheduled_at)}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.duration_minutes} min · {c.subject || student.subject || "Lesson"}
                      {c.location ? ` · ${c.location}` : ""}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">scheduled</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt size={18} className="text-amber-500" />
              Recent Invoices
            </CardTitle>
            <Link href={`/share/${params.token}/invoices`}>
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <div className="text-sm font-medium">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(inv.period_start).toLocaleDateString()} — {new Date(inv.period_end).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{currency(Number(inv.total_amount), currencySymbol)}</div>
                    <Badge
                      variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
