import { FormBusy } from "@/components/action-busy";
import { RichText } from "@/components/rich-text";
import { TableExplorer } from "@/components/table-explorer";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarPlus,
  Receipt,
  Pencil,
  Trash2,
  Phone,
  Mail,
  UserCircle,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Wallet,
  ArrowRight,
  GraduationCap,
  FileText,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  KeyRound,
} from "lucide-react";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { addStudentNote, deleteStudentNote } from "@/lib/actions";
import { EditStudentDialog } from "@/components/edit-student-dialog";
import { ScheduleClassDialog } from "@/components/schedule-class-dialog";
import { GenerateInvoiceDialog } from "@/components/generate-invoice-dialog";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { lessonStatus } from "@/lib/lesson-status";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ShareTokenButton } from "@/components/share-token-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { CopyLoginButton } from "@/components/copy-login-button";
import { ReportRow } from "@/components/report-row";
import { NotesTable } from "@/components/notes-table";
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

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const id = Number((await params).id);
  const [student, currencySymbol, allStudents] = await Promise.all([
    queryOne<Student>("SELECT * FROM students WHERE id = ?", [id]),
    getSetting("currency"),
    queryAll<{ id: number; name: string; subject: string | null }>(
      "SELECT id,name,subject FROM students WHERE active=1 ORDER BY name",
    ),
  ]);
  if (!student) notFound();

  const studentOpts = allStudents.map((s) => ({
    id: s.id,
    name: s.name,
    subject: s.subject,
  }));

  const [
    upcoming,
    past,
    invoices,
    notes,
    classNotes,
    classReports,
    shareTokenRow,
    statsRow,
  ] = await Promise.all([
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? AND status = 'scheduled' AND scheduled_at >= ? ORDER BY scheduled_at LIMIT 5",
      [id, new Date().toISOString()],
    ),
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? AND julianday(scheduled_at) <= julianday(?) ORDER BY julianday(scheduled_at) DESC LIMIT 5",
      [id, new Date().toISOString()],
    ),
    queryAll<Invoice>(
      "SELECT * FROM invoices WHERE student_id = ? ORDER BY issued_at DESC LIMIT 5",
      [id],
    ),
    queryAll<StudentNote>(
      "SELECT * FROM student_notes WHERE student_id = ? ORDER BY created_at DESC LIMIT 5",
      [id],
    ),
    queryAll<{
      id: number;
      scheduled_at: string;
      subject: string | null;
      content: string;
      has_whiteboard: number;
    }>(
      `SELECT c.id, c.scheduled_at, c.subject, cn.content, CASE WHEN w.class_id IS NOT NULL THEN 1 ELSE 0 END AS has_whiteboard FROM classes c
       LEFT JOIN class_notes cn ON cn.class_id = c.id AND cn.scope = 'teacher'
       LEFT JOIN whiteboards w ON w.class_id=c.id
       WHERE c.student_id = ? AND (TRIM(COALESCE(cn.content,'')) != '' OR w.class_id IS NOT NULL)
       ORDER BY c.scheduled_at DESC LIMIT 5`,
      [id],
    ),
    queryAll<{
      id: number;
      class_id: number;
      scheduled_at: string;
      subject: string | null;
      topics_covered: string | null;
      homework: string | null;
      performance: string | null;
      strengths: string | null;
      areas_to_improve: string | null;
      next_focus: string | null;
      rating: number | null;
    }>(
      `SELECT r.id, r.class_id, c.scheduled_at, c.subject,
              r.topics_covered, r.homework, r.performance,
              r.strengths, r.areas_to_improve, r.next_focus, r.rating
       FROM reports r
       JOIN classes c ON c.id = r.class_id
       WHERE c.student_id = ?
       ORDER BY c.scheduled_at DESC LIMIT 5`,
      [id],
    ),
    queryOne<{ token: string }>(
      "SELECT token FROM share_tokens WHERE student_id = ? AND active = 1 ORDER BY id DESC LIMIT 1",
      [id],
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
        (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status = 'completed' AND julianday(scheduled_at)<=julianday('now')) AS completed_classes,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM classes WHERE student_id = ? AND status = 'completed' AND julianday(scheduled_at)<=julianday('now')) AS total_hours,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE student_id = ? AND status <> 'canceled') AS total_revenue,
        (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status != 'canceled' AND julianday(scheduled_at)<=julianday('now') AND attendance IN ('present','late')) AS present_count,
        (SELECT COUNT(*) FROM classes WHERE student_id = ? AND status != 'canceled' AND julianday(scheduled_at)<=julianday('now') AND attendance IN ('present','late','absent')) AS completed_for_attendance`,
      [id, id, id, id, id, id],
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
      ? Math.round(
          (Number(stats.present_count) /
            Number(stats.completed_for_attendance)) *
            100,
        )
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
      bg: "bg-orange-50",
      iconColor: "text-orange-500",
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
            <ShareTokenButton
              studentId={id}
              existingToken={shareTokenRow?.token ?? null}
            />
            <EditStudentDialog student={student} />
            <ScheduleClassDialog students={studentOpts} defaultStudentId={id} />
          </div>
        }
      />

      {/* Hero Profile Card */}
      <Card className="border shadow-none mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar + Name */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16 border-4 border-orange-100">
                {student.profile_photo_url && <AvatarImage src={student.profile_photo_url} alt={student.name} />}
                <AvatarFallback className="bg-[#b82f25] text-white text-xl font-bold">
                  {getInitials(student.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {student.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
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

            <Separator
              orientation="vertical"
              className="hidden sm:block h-16 self-center"
            />

            {/* Contact Info */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
                  <Phone size={16} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Phone
                  </div>
                  <div className="text-sm font-medium">
                    {student.phone || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
                  <Mail size={16} className="text-emerald-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Email
                  </div>
                  <div className="text-sm font-medium truncate max-w-[180px]">
                    {student.email || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
                  <UserCircle size={16} className="text-orange-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Guardian
                  </div>
                  <div className="text-sm font-medium">
                    {student.guardian_name || "—"}
                  </div>
                  {student.guardian_contact && (
                    <div className="text-xs text-muted-foreground">
                      {student.guardian_contact}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(student.username || student.password) && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
                  <KeyRound size={16} className="text-orange-500" />
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Username
                    </div>
                    <div className="text-sm font-mono font-medium break-all">
                      {student.username || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Password
                    </div>
                    <div className="text-sm font-mono font-medium break-all">
                      {student.password || "—"}
                    </div>
                  </div>
                  <CopyLoginButton
                    username={student.username || "—"}
                    password={student.password || "—"}
                  />
                </div>
              </div>
            </>
          )}

          {student.notes && (
            <>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {student.notes}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="student-profile-stats grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <Card key={card.label} className="border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${card.bg}`}
                >
                  <card.icon size={20} className={card.iconColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming + Past Classes */}
      <div className="grid grid-cols-1 items-start lg:grid-cols-2 gap-6 mb-6">
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={18} className="text-orange-500" />
                  Upcoming Classes
                </CardTitle>
                <CardDescription>
                  Showing up to 5 scheduled lessons
                </CardDescription>
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
                    <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-orange-50/50 hover:shadow-sm">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
                        <Clock size={16} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {fmtDateTime(c.scheduled_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.duration_minutes} min ·{" "}
                          {c.subject || student.subject || "Lesson"}
                          {c.location ? ` · ${c.location}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {c.is_trial ? (
                          <Badge variant="outline" className="text-xs">
                            TRIAL
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="text-xs">
                          scheduled
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <PreviewLink
            href={`/students/${id}/history?section=upcoming`}
            label="View all upcoming lessons"
          />
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  Past Classes
                </CardTitle>
                <CardDescription>Latest 5 past lessons</CardDescription>
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
                    <div
                      className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-secondary/50 hover:shadow-sm ${c.status === "canceled" ? "opacity-60" : ""}`}
                    >
                      <div
                        className={`flex size-9 items-center justify-center rounded-lg ${
                          lessonStatus(c.status, c.attendance).iconClassName
                        }`}
                      >
                        {c.status === "completed" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium ${c.status === "canceled" ? "line-through" : ""}`}
                        >
                          {fmtDateTime(c.scheduled_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.duration_minutes} min · {c.attendance || "—"}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {c.is_trial ? (
                          <Badge variant="outline" className="text-xs">
                            TRIAL
                          </Badge>
                        ) : null}
                        <LessonStatusBadge
                          status={c.status}
                          attendance={c.attendance}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <PreviewLink
            href={`/students/${id}/history?section=classes`}
            label="View all past lessons"
          />
        </Card>
      </div>

      {/* Invoices */}
      <Card className="border shadow-none mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-amber-500" />
                Invoices
              </CardTitle>
              <CardDescription>Latest 5 invoices</CardDescription>
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
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-secondary/50 hover:shadow-sm">
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg ${
                        inv.status === "paid"
                          ? "bg-emerald-50"
                          : inv.status === "overdue"
                            ? "bg-red-50"
                            : "bg-amber-50"
                      }`}
                    >
                      {inv.status === "paid" ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : inv.status === "overdue" ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : (
                        <FileText size={16} className="text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {inv.invoice_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">
                        {currency(Number(inv.total_amount), currencySymbol)}
                      </div>
                      <Badge
                        variant={statusVariant(inv.status)}
                        className="text-xs"
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
        <PreviewLink
          href={`/students/${id}/history?section=invoices`}
          label="View all invoices"
        />
      </Card>

      {/* Class Notes */}
      <Card className="border shadow-none mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <StickyNote size={18} className="text-amber-500" />
            Class Notes
          </CardTitle>
          <CardDescription>
            Notes taken during live class sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No class notes yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TableExplorer>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">
                        Date
                      </th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">
                        Subject
                      </th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classNotes.map((cn) => (
                      <tr
                        key={cn.id}
                        className="border-b border-border/50 hover:bg-amber-50/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          <Link
                            href={`/classes/${cn.id}`}
                            className="hover:text-orange-600 hover:underline"
                          >
                            {fmtDateTime(cn.scheduled_at)}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-foreground">
                          {cn.subject || student.subject || "Lesson"}
                        </td>
                        <td className="py-2.5 px-3 text-foreground whitespace-pre-line">
                          <RichText content={cn.content} />
                          {cn.has_whiteboard === 1 && (
                            <Link
                              href={"/meeting/" + cn.id + "/whiteboard"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-block font-medium text-primary"
                            >
                              Open lesson whiteboard ↗
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableExplorer>
            </div>
          )}
        </CardContent>
        <PreviewLink
          href={`/students/${id}/history?section=notes`}
          label="View all class notes"
        />
      </Card>

      {/* Class Reports */}
      <Card className="border shadow-none mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} className="text-orange-500" />
            Class Reports
          </CardTitle>
          <CardDescription>Latest 5 class reports</CardDescription>
        </CardHeader>
        <CardContent>
          {classReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No class reports yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TableExplorer>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Topics
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {classReports.map((r) => (
                      <ReportRow
                        key={r.id}
                        report={r}
                        defaultSubject={student.subject || "Lesson"}
                      />
                    ))}
                  </tbody>
                </table>
              </TableExplorer>
            </div>
          )}
        </CardContent>
        <PreviewLink
          href={`/students/${id}/history?section=reports`}
          label="View all reports"
        />
      </Card>

      {/* Running Notes */}
      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-orange-500" />
            Running Notes
          </CardTitle>
          <CardDescription>
            Session-by-session observations about this student
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addStudentNote.bind(null, id)} className="mb-4">
                <FormBusy />
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
          <NotesTable
            notes={notes}
            studentId={id}
            deleteAction={deleteStudentNote}
          />
        </CardContent>
        <PreviewLink
          href={`/students/${id}/history?section=running-notes`}
          label="View all running notes"
        />
      </Card>
    </>
  );
}

function PreviewLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="border-t border-border px-6 py-4">
      <Link
        href={href}
        className="inline-flex items-center gap-2 font-medium text-primary"
      >
        {label} <ArrowRight size={17} />
      </Link>
    </div>
  );
}
