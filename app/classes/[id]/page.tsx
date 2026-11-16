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
import { queryOne } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { markAttendance, saveReport, updateClass } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lessonStatus } from "@/lib/lesson-status";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Field, TextAreaField, SelectField } from "@/components/form-field";
import { CancelClassDialog } from "@/components/cancel-dialog";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { PostClassReportDialog } from "@/components/post-class-report-dialog";
import { fmtDateTime, fmtDateInput } from "@/lib/format";
import type { ClassRow, Report, Student, Attendance } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusConfig(status: string, attendance: string | null) {
  const state = lessonStatus(status, attendance);
  return { variant: "outline" as const, bg: state.iconClassName, iconColor: "", label: state.label };
}

function attendanceConfig(attendance: string | null) {
  switch (attendance) {
    case "present":
      return {
        bg: "bg-emerald-50",
        iconColor: "text-emerald-500",
        label: "Present",
      };
    case "late":
      return {
        bg: "bg-emerald-50",
        iconColor: "text-emerald-500",
        label: "Present",
      };
    case "absent":
      return { bg: "bg-red-50", iconColor: "text-red-500", label: "Absent" };
    default:
      return {
        bg: "bg-gray-50",
        iconColor: "text-gray-400",
        label: "Not marked",
      };
  }
}

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
  const cls = await queryOne<ClassRow>(
    "SELECT id, student_id, scheduled_at, duration_minutes, subject, location, status, attendance, recurrence_id, is_trial, cancel_reason, rescheduled_from, meeting_room, created_at FROM classes WHERE id = ?",
    [id],
  );
  if (!cls) notFound();

  const [student, report, teacherNote] = await Promise.all([
    queryOne<Student>(
      "SELECT id, name, subject, grade_level, phone, email, guardian_name, guardian_contact, hourly_rate, notes, username, password, active, created_at FROM students WHERE id = ?",
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
  ]);
  if (!student) notFound();

  const attend = markAttendance.bind(null, id);
  const saveR = saveReport.bind(null, id);
  const upd = updateClass.bind(null, id);

  const sc = statusConfig(cls.status, cls.attendance);
  const ac = attendanceConfig(cls.attendance);
  const backHref = query.from === "dashboard" ? "/" : "/schedule";

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <span
              className={
                cls.status === "canceled" ? "line-through opacity-60" : ""
              }
            >
              Class Details
            </span>
          </div>
        }
        subtitle={`${student.name} · ${fmtDateTime(cls.scheduled_at)}`}
        action={
          <div className="flex gap-2">
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
              <Link href={`/meeting/${id}`}>
                <Button>
                  <Video size={16} /> Join Meeting
                </Button>
              </Link>
            )}
            <Link href={`/students/${student.id}`}>
              <Button variant="secondary">
                <UserCircle size={16} /> Student profile
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero Info Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#b82f25] p-6 text-white shadow-none mb-6">
        <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-0 size-20 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {fmtDateTime(cls.scheduled_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Timer size={14} /> {cls.duration_minutes} min
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} />{" "}
                {cls.subject || student.subject || "Lesson"}
              </span>
              {cls.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {cls.location}
                </span>
              )}
            </div>
            {cls.rescheduled_from && (
              <Badge className="mt-2 bg-white/20 text-white border-white/30">
                Rescheduled
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {cls.is_trial && (
              <Badge className="bg-amber-400/90 text-white border-0">
                TRIAL
              </Badge>
            )}
            <LessonStatusBadge status={cls.status} attendance={cls.attendance} />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <LessonStatusBadge status={cls.status} attendance={cls.attendance} />
                </div>
                {cls.cancel_reason && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Reason: {cls.cancel_reason}
                  </p>
                )}
              </div>
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${sc.bg}`}
              >
                <GraduationCap size={20} className={sc.iconColor} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-lg font-bold mt-1 text-foreground">
                  {ac.label}
                </p>
              </div>
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${ac.bg}`}
              >
                {cls.attendance === "present" ? (
                  <Check size={20} className={ac.iconColor} />
                ) : cls.attendance === "absent" ? (
                  <X size={20} className={ac.iconColor} />
                ) : (
                  <Check size={20} className={ac.iconColor} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-lg font-bold mt-1 text-foreground">
                  {Number(student.hourly_rate).toFixed(2)}/hr
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Duration: {(Number(cls.duration_minutes) / 60).toFixed(2)}h
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-50">
                <Wallet size={20} className="text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Notes */}
      {teacherNote?.content && (
        <Card className="mb-6 border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-500" />
              Teacher Notes
            </CardTitle>
            <CardDescription>
              Private notes from the live class — never shown to students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-foreground whitespace-pre-wrap">
              {teacherNote.content}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark Attendance */}
      <Card className="mb-6 border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} className="text-orange-500" />
            Mark Attendance
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
                  cls.attendance === "present"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }
                variant={cls.attendance === "present" ? "default" : "outline"}
              >
                <Check size={16} /> Present
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
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-sm"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                }
                variant={cls.attendance === "absent" ? "default" : "outline"}
              >
                <X size={16} /> Absent
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

      {/* Post-Class Report */}
      <Card className="mb-6 border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-orange-500" />
            Post-Class Report
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

      {/* Edit Class Details */}
      <Card className="mb-6 border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Pencil size={18} className="text-amber-500" />
            Edit Class Details
          </CardTitle>
          <CardDescription>
            Modify the class schedule, status, or attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LessonActionForm action={upd}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Date & time"
                name="scheduled_at"
                type="datetime-local"
                defaultValue={fmtDateInput(cls.scheduled_at)}
              />
              <Field
                label="Duration (minutes)"
                name="duration_minutes"
                type="number"
                defaultValue={Number(cls.duration_minutes)}
                min={5}
                max={1440}
              />
              <input type="hidden" name="subject" value={cls.subject ?? ""} />
              <input type="hidden" name="location" value={cls.location ?? ""} />
              <SelectField
                label="Status"
                name="status"
                defaultValue={cls.status}
                options={[
                  { value: "scheduled", label: "Scheduled" },
                  { value: "completed", label: "Completed" },
                  { value: "canceled", label: "Canceled" },
                ]}
              />
              <SelectField
                label="Attendance"
                name="attendance"
                defaultValue={
                  String(cls.attendance) === "late"
                    ? "present"
                    : (cls.attendance ?? "")
                }
                options={[
                  { value: "", label: "—" },
                  { value: "present", label: "Present" },
                  { value: "absent", label: "Absent" },
                ]}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit">
                <Check size={14} /> Save changes
              </Button>
            </div>
          </LessonActionForm>
        </CardContent>
      </Card>

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
