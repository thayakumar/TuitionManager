import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarPlus, Receipt, Pencil, Trash2, Phone, Mail, UserCircle,
  BookOpen, Clock, CheckCircle2, XCircle, Calendar, Wallet,
  ArrowRight, GraduationCap, FileText, MessageSquare, AlertCircle,
  TrendingUp, KeyRound,
} from "lucide-react";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { addStudentNote, deleteStudentNote } from "@/lib/actions";
import { EditStudentDialog } from "@/components/edit-student-dialog";
import { ScheduleClassDialog } from "@/components/schedule-class-dialog";
import { GenerateInvoiceDialog } from "@/components/generate-invoice-dialog";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ShareTokenButton } from "@/components/share-token-button";
import { currency, fmtDateTime, fmtDate } from "@/lib/format";
import { StickyNote } from "lucide-react";
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
  if (!(await isAdminRequest())) redirect("/portal/admin");
  const id = Number(params.id);
  const [student, currencySymbol] = await Promise.all([
    queryOne<Student>("SELECT * FROM students WHERE id = ?", [id]),
    getSetting("currency"),
  ]);
  if (!student) notFound();

  const allStudents = await queryAll<{ id: number; name: string; subject: string | null }>(
    "SELECT id, name, subject FROM students WHERE active = 1 ORDER BY name"
  );
  const studentOpts = allStudents.map((s) => ({ id: s.id, name: s.name, subject: s.subject }));

  const [upcoming, past, invoices, notes, teacherNotes, classReports, shareTokenRow, statsRow] = await Promise.all([
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
    queryAll<{ id: number; scheduled_at: string; subject: string | null; teacher_notes: string }>(
      `SELECT c.id, c.scheduled_at, c.subject, n.content AS teacher_notes
       FROM class_notes n
       JOIN classes c ON c.id = n.class_id
       WHERE c.student_id = ? AND n.scope = 'teacher' AND TRIM(n.content) != ''
       ORDER BY c.scheduled_at DESC LIMIT 20`,
      [id]
    ),
    queryAll<{
      id: number; class_id: number; scheduled_at: string; subject: string | null;
      topics_covered: string | null; homework: string | null; performance: string | null;
      strengths: string | null; areas_to_improve: string | null; next_focus: string | null;
      rating: number | null;
    }>(
      `SELECT r.id, r.class_id, c.scheduled_at, c.subject,
              r.topics_covered, r.homework, r.performance,
              r.strengths, r.areas_to_improve, r.next_focus, r.rating
       FROM reports r
       JOIN classes c ON c.id = r.class_id
       WHERE c.student_id = ?
       ORDER BY c.scheduled_at DESC LIMIT 20`,
      [id]
    ),
    queryOne<{ token: string }>(
      "SELECT token FROM share_tokens WHERE student_id = ? AND active = 1 ORDER BY id DESC LIMIT 1",
      [id]
    ),
    queryOne<{
      total_classes: number;
      completed_classes: number;
      total_hours: number;
      total_revenue: number;
      present_count: number;
      completed_for_attendance: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM classes WHERE student_id = ?) AS total_classes,
        (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status = 'completed') AS completed_classes,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM classes WHERE student_id = ? AND status = 'completed') AS total_hours,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE student_id = ? AND status = 'paid') AS total_revenue,
        (SELECT COUNT(*) FROM classes WHERE student_id = ? AND attendance = 'present') AS present_count,
        (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status = 'completed' AND attendance IS NOT NULL) AS completed_for_attendance`,
      [id, id, id, id, id, id]
    ),
  ]);

  const stats = statsRow ?? {
    total_classes: 0,
    completed_classes: 0,
    total_hours: 0,
    total_revenue: 0,
    present_count: 0,
    completed_for_attendance: 0,
  };

  const attendancePct =
    Number(stats.completed_for_attendance) > 0
      ? Math.round((Number(stats.present_count) / Number(stats.completed_for_attendance)) * 100)
      : 0;

  const statCards = [
    {
      label: "Total Classes",
      value: Number(stats.total_classes),
      icon: Calendar,
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: "Completed",
      value: Number(stats.completed_classes),
      icon: CheckCircle2,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      label: "Revenue",
      value: currency(Number(stats.total_revenue), currencySymbol),
      icon: Wallet,
      bg: "bg-violet-50",
      iconColor: "text-violet-500",
    },
    {
      label: "Attendance",
      value: `${attendancePct}%`,
      icon: TrendingUp,
      bg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={`${student.subject || "General"}${student.grade_level ? " · " + student.grade_level : ""} · ${currency(Number(student.hourly_rate), currencySymbol)}/hr`}
        action={
          <div className="flex flex-wrap gap-2">
            <ShareTokenButton studentId={id} existingToken={shareTokenRow?.token ?? null} />
            <EditStudentDialog student={student} />
            <ScheduleClassDialog students={studentOpts} defaultStudentId={id} />
          </div>
        }
      />

      {/* Hero Profile Card */}
      <Card className="shadow-sm border-0 mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar + Name */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16 border-4 border-indigo-100">
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xl font-bold">
                  {getInitials(student.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {student.subject && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      <BookOpen size={12} />
                      {student.subject}
                    </span>
                  )}
                  {student.grade_level && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      <GraduationCap size={12} />
                      {student.grade_level}
                    </span>
                  )}
                  {student.active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 border-0 hover:bg-red-100">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-16 self-center" />

            {/* Contact Info */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
                  <Phone size={16} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Phone</div>
                  <div className="text-sm font-medium">{student.phone || "—"}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
                  <Mail size={16} className="text-emerald-500" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Email</div>
                  <div className="text-sm font-medium truncate max-w-[180px]">{student.email || "—"}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-violet-50">
                  <UserCircle size={16} className="text-violet-500" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Guardian</div>
                  <div className="text-sm font-medium">{student.guardian_name || "—"}</div>
                  {student.guardian_contact && (
                    <div className="text-xs text-muted-foreground">{student.guardian_contact}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(student.username || student.password) && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center gap-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
                  <KeyRound size={16} className="text-orange-500" />
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Username</div>
                    <div className="text-sm font-mono font-medium">{student.username || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Password</div>
                    <div className="text-sm font-mono font-medium">{student.password || "—"}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {student.notes && (
            <>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{student.notes}</div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Upcoming + Past Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-500" />
                  Upcoming Classes
                </CardTitle>
                <CardDescription>{upcoming.length} scheduled</CardDescription>
              </div>
              {upcoming.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {upcoming.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">None scheduled</p>
                <ScheduleClassDialog
                  students={studentOpts}
                  defaultStudentId={id}
                  trigger={
                    <Button variant="outline" size="sm" className="mt-3">
                      <CalendarPlus size={14} /> Schedule a class
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`} className="block">
                    <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-indigo-50/50 hover:shadow-sm">
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
                      <div className="flex gap-1.5 shrink-0">
                        {c.is_trial ? <Badge variant="outline" className="text-[10px]">TRIAL</Badge> : null}
                        <Badge variant="secondary" className="text-[10px]">scheduled</Badge>
                      </div>
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
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  Past Classes
                </CardTitle>
                <CardDescription>{past.length} recorded</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {past.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`} className="block">
                    <div className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-secondary/50 hover:shadow-sm ${c.status === "canceled" ? "opacity-60" : ""}`}>
                      <div className={`flex size-9 items-center justify-center rounded-lg ${
                        c.status === "completed" ? "bg-emerald-50" : "bg-red-50"
                      }`}>
                        {c.status === "completed" ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${c.status === "canceled" ? "line-through" : ""}`}>
                          {fmtDateTime(c.scheduled_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.duration_minutes} min · {c.attendance || "—"}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {c.is_trial ? <Badge variant="outline" className="text-[10px]">TRIAL</Badge> : null}
                        <Badge variant={statusVariant(c.status)} className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card className="shadow-sm border-0 mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-amber-500" />
                Invoices
              </CardTitle>
              <CardDescription>{invoices.length} total</CardDescription>
            </div>
            <CardAction>
              <GenerateInvoiceDialog
                students={studentOpts}
                defaultStudentId={id}
                trigger={
                  <Button variant="secondary" size="sm">
                    <Receipt size={14} /> Generate
                  </Button>
                }
              />
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No invoices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
                  <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-secondary/50 hover:shadow-sm">
                    <div className={`flex size-9 items-center justify-center rounded-lg ${
                      inv.status === "paid" ? "bg-emerald-50" :
                      inv.status === "overdue" ? "bg-red-50" : "bg-amber-50"
                    }`}>
                      {inv.status === "paid" ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : inv.status === "overdue" ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : (
                        <FileText size={16} className="text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{inv.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">{currency(Number(inv.total_amount), currencySymbol)}</div>
                      <Badge variant={statusVariant(inv.status)} className="text-[10px]">{inv.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teacher Notes */}
      <Card className="shadow-sm border-0 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <StickyNote size={18} className="text-amber-500" />
            Teacher Notes
          </CardTitle>
          <CardDescription>Private notes taken during live class sessions — never shown to students</CardDescription>
        </CardHeader>
        <CardContent>
          {teacherNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No class notes yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">Date</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">Subject</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherNotes.map((cn) => (
                    <tr key={cn.id} className="border-b border-border/50 hover:bg-amber-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        <Link href={`/classes/${cn.id}`} className="hover:text-indigo-600 hover:underline">
                          {fmtDateTime(cn.scheduled_at)}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-foreground">{cn.subject || student.subject || "Lesson"}</td>
                      <td className="py-2.5 px-3 text-foreground whitespace-pre-line">{cn.teacher_notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Reports */}
      <Card className="shadow-sm border-0 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" />
            Class Reports
          </CardTitle>
          <CardDescription>Post-class session reports</CardDescription>
        </CardHeader>
        <CardContent>
          {classReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No class reports yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Topics</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Homework</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strengths</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">To Improve</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Focus</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {classReports.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-indigo-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        <Link href={`/classes/${r.class_id}`} className="hover:text-indigo-600 hover:underline">
                          {fmtDateTime(r.scheduled_at)}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-foreground">{r.subject || student.subject || "Lesson"}</td>
                      <td className="py-2.5 px-3 text-foreground">{r.topics_covered || "—"}</td>
                      <td className="py-2.5 px-3 text-foreground">{r.homework || "—"}</td>
                      <td className="py-2.5 px-3 text-foreground">{r.performance || "—"}</td>
                      <td className="py-2.5 px-3 text-foreground">{r.strengths || "—"}</td>
                      <td className="py-2.5 px-3 text-foreground">{r.areas_to_improve || "—"}</td>
                      <td className="py-2.5 px-3 text-foreground">{r.next_focus || "—"}</td>
                      <td className="py-2.5 px-3 text-center">
                        {r.rating != null ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium">
                            {r.rating}/5
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Running Notes */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-violet-500" />
            Running Notes
          </CardTitle>
          <CardDescription>Session-by-session observations about this student</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addStudentNote.bind(null, id)} className="mb-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Textarea
                  name="content"
                  rows={2}
                  required
                  placeholder="Add a note about this student..."
                  className="resize-none"
                />
              </div>
              <Button type="submit" size="sm" className="mb-0.5">
                Add note
              </Button>
            </div>
          </form>
          {notes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((n, i) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-secondary/30"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 shrink-0 mt-0.5">
                    <MessageSquare size={14} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  <form action={deleteStudentNote.bind(null, n.id, id)}>
                    <Button type="submit" variant="ghost" size="icon-sm" title="Delete note" className="shrink-0 opacity-0 group-hover:opacity-100 hover:!opacity-100 text-muted-foreground hover:text-red-500">
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
