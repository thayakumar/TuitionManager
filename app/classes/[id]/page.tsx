import {DocumentLibrary} from "@/components/document-library";
import { RichText } from "@/components/rich-text";
import { LessonActionForm } from "@/components/lesson-action-form";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Check,
  X,
  Clock,
  Trash2,
  Pencil,
  BookOpen,
  Star,
  GraduationCap,
  MapPin,
  Calendar,
  Timer,
  AlertTriangle,
  ClipboardList,
  Target,
  Brain,
  Lightbulb,
  MessageSquare,
  ArrowLeft,
  UserCircle,
  Wallet,
  Video,
} from "lucide-react";
import { getSetting, queryOne } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { markAttendance, saveReport } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Field, TextAreaField, SelectField } from "@/components/form-field";
import { CancelClassDialog } from "@/components/cancel-dialog";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { PostClassReportDialog } from "@/components/post-class-report-dialog";
import { currency, fmtDateTime, fmtDateInput } from "@/lib/format";
import type { ClassRow, Report, Student, Attendance } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; report?: string }>;
}) {
  await requireAdminPage();
  const [route, query] = await Promise.all([params, searchParams]);
  const id = Number(route.id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const cls = await queryOne<ClassRow>(
    "SELECT id, student_id, scheduled_at, duration_minutes, subject, location, status, attendance, recurrence_id, is_trial, cancel_reason, rescheduled_from, meeting_room, created_at FROM classes WHERE id = ?",
    [id],
  );
  if (!cls) notFound();

  const [student, report, teacherNote, currencySetting] = await Promise.all([
    queryOne<Student>(
      "SELECT id, name, subject, grade_level, phone, email, guardian_name, guardian_contact, hourly_rate, notes, username, active, created_at FROM students WHERE id = ?",
      [cls.student_id],
    ),
    queryOne<Report>(
      "SELECT id, class_id, topics_covered, homework, performance, strengths, areas_to_improve, next_focus, rating, created_at, updated_at FROM reports WHERE class_id = ?",
      [id],
    ),
    queryOne<{ content: string }>(
      "SELECT content FROM class_notes WHERE class_id = ? AND scope = 'teacher'",
      [id],
    ),
    getSetting("currency"),
  ]);
  if (!student) notFound();

  const currencySymbol = currencySetting || "RM";
  const attend = markAttendance.bind(null, id);
  const saveR = saveReport.bind(null, id);
  const backHref = query.from === "dashboard" ? "/dashboard" : "/schedule";

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
            >
              <Link href={backHref} aria-label="Back to schedule">
                <ArrowLeft size={18} aria-hidden="true" />
              </Link>
            </Button>
            <span
              className={
                cls.status === "canceled" ? "line-through opacity-60" : ""
              }
            >
              Lesson details
            </span>
          </div>
        }
        subtitle={`${student.name} · ${fmtDateTime(cls.scheduled_at)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {report && (
              <WhatsAppShare
                text={[
                  `Class Report: ${student.name}`,
                  `${fmtDateTime(cls.scheduled_at)}`,
                  report.topics_covered
                    ? `\nTopics: ${report.topics_covered}`
                    : "",
                  report.homework ? `Homework: ${report.homework}` : "",
                  report.performance
                    ? `Performance: ${report.performance}`
                    : "",
                  report.rating ? `Rating: ${report.rating}/5` : "",
                ]
                  .filter(Boolean)
                  .join("\n")}
              />
            )}
            {cls.status !== "canceled" && (
              <Button asChild>
                <Link href={`/meeting/${id}`}>
                  <Video size={16} aria-hidden="true" /> Join meeting
                </Link>
              </Button>
            )}
            {!cls.is_trial && (
              <Button asChild variant="outline">
                <Link href={`/diagnostics/${student.id}`}>
                  <Brain size={16} aria-hidden="true" /> Diagnostic
                </Link>
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href={`/students/${student.id}`}>
                <UserCircle size={16} aria-hidden="true" /> Student profile
              </Link>
            </Button>
          </div>
        }
      />

      {/* Hero Info Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-none mb-6">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{student.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-primary-foreground/85">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" /> {fmtDateTime(cls.scheduled_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Timer size={14} aria-hidden="true" /> {cls.duration_minutes} min ({(Number(cls.duration_minutes) / 60).toFixed(2)}h)
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} aria-hidden="true" />{" "}
                {cls.subject || student.subject || "Lesson"}
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet size={14} aria-hidden="true" />{" "}
                {cls.is_trial ? "Free trial" : `${currency(Number(student.hourly_rate), currencySymbol)}/hr`}
              </span>
              {cls.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} aria-hidden="true" /> {cls.location}
                </span>
              )}
            </div>
            {cls.cancel_reason && (
              <p className="mt-2 text-xs text-primary-foreground/85">
                Cancellation note: {cls.cancel_reason}
              </p>
            )}
            {cls.rescheduled_from && (
              <Badge className="mt-2 bg-white/20 text-white border-white/30">
                Rescheduled
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cls.is_trial ? (
              <Badge className="bg-amber-100 text-amber-950 border-0 font-semibold">
                TRIAL
              </Badge>
            ) : null}
            <LessonStatusBadge
              status={cls.status}
              attendance={cls.attendance}
            />
          </div>
        </div>
      </div>

      {/* 1. Primary post-lesson action: Mark Attendance */}
      <Card className="mb-6 border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" aria-hidden="true" />
            Mark attendance
          </CardTitle>
          <CardDescription>
            Present = attended. Absent = last-minute cancellation or no-show (no
            charge). Advance-cancelled lessons are excluded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <LessonActionForm
              action={attend.bind(null, "present" as Attendance)}
            >
              <Button
                type="submit"
                disabled={cls.status === "canceled"}
                className={
                  cls.attendance === "present" || cls.attendance === "late"
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }
                variant={
                  cls.attendance === "present" || cls.attendance === "late"
                    ? "default"
                    : "outline"
                }
              >
                <Check size={16} aria-hidden="true" /> Present
              </Button>
            </LessonActionForm>
            <LessonActionForm
              action={attend.bind(null, "absent" as Attendance)}
            >
              <Button
                type="submit"
                disabled={cls.status === "canceled"}
                className={
                  cls.attendance === "absent"
                    ? "bg-red-700 hover:bg-red-800 text-white shadow-sm"
                    : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
                }
                variant={cls.attendance === "absent" ? "default" : "outline"}
              >
                <X size={16} aria-hidden="true" /> Absent
              </Button>
            </LessonActionForm>
          </div>
          {cls.status === "scheduled" && (
            <>
              <Separator className="my-4" />
              <CancelClassDialog classId={id} />
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Teacher Notes (private, context for writing the report) */}
      {teacherNote?.content && (
        <Card className="mb-6 border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-700" aria-hidden="true" />
              Teacher notes
            </CardTitle>
            <CardDescription>
              Private notes from the live class — never shown to students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RichText
              content={teacherNote.content}
              className="rounded-lg bg-amber-50/70 px-4 py-3 text-base text-foreground"
            />
          </CardContent>
        </Card>
      )}

      {/* 3. Post-Class Report */}
      <Card className="mb-6 border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" aria-hidden="true" />
            Post-class report
          </CardTitle>
          <CardDescription>
            Record what was covered and how the student performed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LessonActionForm action={saveR}>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={14} className="text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Content
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <TextAreaField
                    label="Topics covered"
                    name="topics_covered"
                    rows={3}
                    defaultValue={report?.topics_covered ?? ""}
                    placeholder="What was taught this class"
                  />
                  <TextAreaField
                    label="Homework assigned"
                    name="homework"
                    rows={2}
                    defaultValue={report?.homework ?? ""}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={14} className="text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Performance
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextAreaField
                    label="Strengths"
                    name="strengths"
                    rows={2}
                    defaultValue={report?.strengths ?? ""}
                  />
                  <TextAreaField
                    label="Areas to improve"
                    name="areas_to_improve"
                    rows={2}
                    defaultValue={report?.areas_to_improve ?? ""}
                  />
                </div>
                <div className="mt-4">
                  <TextAreaField
                    label="Overall performance"
                    name="performance"
                    rows={2}
                    defaultValue={report?.performance ?? ""}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Next Steps
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextAreaField
                    label="Focus for next class"
                    name="next_focus"
                    rows={2}
                    defaultValue={report?.next_focus ?? ""}
                  />
                  <SelectField
                    label="Rating (1-5)"
                    name="rating"
                    defaultValue={report?.rating ? String(report.rating) : ""}
                    options={[
                      { value: "", label: "—" },
                      { value: "1", label: "1 · Struggled" },
                      { value: "2", label: "2 · Below average" },
                      { value: "3", label: "3 · Average" },
                      { value: "4", label: "4 · Good" },
                      { value: "5", label: "5 · Excellent" },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit">
                <Star size={14} />
                {report ? "Update report" : "Save report"}
              </Button>
            </div>
          </LessonActionForm>
        </CardContent>
      </Card>

      {/* 4. Secondary lesson tools: Whiteboard & Documents */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lesson whiteboard</CardTitle>
            <CardDescription>
              Shared with this student and saved with this lesson.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link
                href={`/meeting/${id}/whiteboard`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open whiteboard ↗
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border shadow-none">
          <CardContent className="p-5">
            <DocumentLibrary admin classId={id} compact />
          </CardContent>
        </Card>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Lesson history, reports and notes are retained when a lesson is
        cancelled. Cancelled lessons do not appear on invoices.
      </p>

      <Suspense>
        <PostClassReportDialog
          classId={id}
          studentName={student.name}
          initialReport={report}
        />
      </Suspense>
    </>
  );
}
