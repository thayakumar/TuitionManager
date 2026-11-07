import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  Check, X, Clock, Trash2, Pencil, BookOpen, Star,
  GraduationCap, MapPin, Calendar, Timer, AlertTriangle,
  ClipboardList, Target, Brain, Lightbulb, MessageSquare,
  ArrowLeft, UserCircle, Wallet, Video,
} from "lucide-react";
import { queryOne } from "@/lib/db";
import { markAttendance, saveReport, deleteClass, updateClass } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Field, TextAreaField, SelectField } from "@/components/form-field";
import { CancelClassDialog } from "@/components/cancel-dialog";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { PostClassReportDialog } from "@/components/post-class-report-dialog";
import { fmtDateTime, fmtDateInput } from "@/lib/format";
import type { ClassRow, Report, Student, Attendance } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return { variant: "default" as const, bg: "bg-emerald-50", iconColor: "text-emerald-500", label: "Completed" };
    case "canceled":
      return { variant: "destructive" as const, bg: "bg-red-50", iconColor: "text-red-500", label: "Canceled" };
    default:
      return { variant: "secondary" as const, bg: "bg-blue-50", iconColor: "text-blue-500", label: "Scheduled" };
  }
}

function attendanceConfig(attendance: string | null) {
  switch (attendance) {
    case "present":
      return { bg: "bg-emerald-50", iconColor: "text-emerald-500", label: "Present" };
    case "late":
      return { bg: "bg-amber-50", iconColor: "text-amber-500", label: "Late" };
    case "absent":
      return { bg: "bg-red-50", iconColor: "text-red-500", label: "Absent" };
    default:
      return { bg: "bg-gray-50", iconColor: "text-gray-400", label: "Not marked" };
  }
}

export default async function ClassDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const cls = await queryOne<ClassRow>("SELECT * FROM classes WHERE id = ?", [id]);
  if (!cls) notFound();

  const [student, report] = await Promise.all([
    queryOne<Student>("SELECT * FROM students WHERE id = ?", [cls.student_id]),
    queryOne<Report>("SELECT * FROM reports WHERE class_id = ?", [id]),
  ]);
  if (!student) notFound();

  const attend = markAttendance.bind(null, id);
  const saveR = saveReport.bind(null, id);
  const upd = updateClass.bind(null, id);
  const del = deleteClass.bind(null, id);

  const sc = statusConfig(cls.status);
  const ac = attendanceConfig(cls.attendance);

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Link href="/schedule" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className={cls.status === "canceled" ? "line-through opacity-60" : ""}>
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
                  report.topics_covered ? `\nTopics: ${report.topics_covered}` : "",
                  report.homework ? `Homework: ${report.homework}` : "",
                  report.performance ? `Performance: ${report.performance}` : "",
                  report.rating ? `Rating: ${report.rating}/5` : "",
                ].filter(Boolean).join("\n")}
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg mb-6">
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
                <BookOpen size={14} /> {cls.subject || student.subject || "Lesson"}
              </span>
              {cls.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {cls.location}
                </span>
              )}
            </div>
            {cls.rescheduled_from && (
              <Badge className="mt-2 bg-white/20 text-white border-white/30">Rescheduled</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {cls.is_trial && (
              <Badge className="bg-amber-400/90 text-white border-0">TRIAL</Badge>
            )}
            <Badge className="bg-white/20 text-white border-white/30 capitalize">{cls.status}</Badge>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant={sc.variant} className="capitalize">{sc.label}</Badge>
                </div>
                {cls.cancel_reason && (
                  <p className="text-xs text-muted-foreground mt-1.5">Reason: {cls.cancel_reason}</p>
                )}
              </div>
              <div className={`flex size-10 items-center justify-center rounded-xl ${sc.bg}`}>
                <GraduationCap size={20} className={sc.iconColor} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-lg font-bold mt-1 text-foreground">{ac.label}</p>
              </div>
              <div className={`flex size-10 items-center justify-center rounded-xl ${ac.bg}`}>
                {cls.attendance === "present" ? <Check size={20} className={ac.iconColor} /> :
                 cls.attendance === "late" ? <Clock size={20} className={ac.iconColor} /> :
                 cls.attendance === "absent" ? <X size={20} className={ac.iconColor} /> :
                 <Check size={20} className={ac.iconColor} />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
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
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50">
                <Wallet size={20} className="text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Notes */}
      {cls.meeting_notes && (
        <Card className="mb-6 shadow-sm border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-500" />
              Class Notes
            </CardTitle>
            <CardDescription>Notes taken during the live class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-foreground whitespace-pre-wrap">
              {cls.meeting_notes}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark Attendance */}
      <Card className="mb-6 shadow-sm border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} className="text-indigo-500" />
            Mark Attendance
          </CardTitle>
          <CardDescription>Record student attendance for this session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <form action={attend.bind(null, "present" as Attendance)}>
              <Button
                type="submit"
                className={
                  cls.attendance === "present"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }
                variant={cls.attendance === "present" ? "default" : "outline"}
              >
                <Check size={16} /> Present
              </Button>
            </form>
            <form action={attend.bind(null, "late" as Attendance)}>
              <Button
                type="submit"
                className={
                  cls.attendance === "late"
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                }
                variant={cls.attendance === "late" ? "default" : "outline"}
              >
                <Clock size={16} /> Late
              </Button>
            </form>
            <form action={attend.bind(null, "absent" as Attendance)}>
              <Button
                type="submit"
                className={
                  cls.attendance === "absent"
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-sm"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                }
                variant={cls.attendance === "absent" ? "default" : "outline"}
              >
                <X size={16} /> Absent
              </Button>
            </form>
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
      <Card className="mb-6 shadow-sm border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-500" />
            Post-Class Report
          </CardTitle>
          <CardDescription>Record what was covered and how the student performed</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveR}>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={14} className="text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</span>
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
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performance</span>
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
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Steps</span>
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
          </form>
        </CardContent>
      </Card>

      {/* Edit Class Details */}
      <Card className="mb-6 shadow-sm border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Pencil size={18} className="text-amber-500" />
            Edit Class Details
          </CardTitle>
          <CardDescription>Modify the class schedule, status, or attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upd}>
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
              />
              <Field label="Subject" name="subject" defaultValue={cls.subject ?? ""} />
              <Field label="Location" name="location" defaultValue={cls.location ?? ""} />
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
                defaultValue={cls.attendance ?? ""}
                options={[
                  { value: "", label: "—" },
                  { value: "present", label: "Present" },
                  { value: "late", label: "Late" },
                  { value: "absent", label: "Absent" },
                ]}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit">
                <Check size={14} /> Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="shadow-sm border border-red-200 bg-red-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions for this class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Delete this class</p>
              <p className="text-xs text-muted-foreground">Once deleted, this class and its data cannot be recovered.</p>
            </div>
            <form action={del}>
              <Button type="submit" variant="destructive">
                <Trash2 size={14} /> Delete class
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Suspense>
        <PostClassReportDialog classId={id} studentName={student.name} />
      </Suspense>
    </>
  );
}
