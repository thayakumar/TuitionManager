import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, Clock, Trash2 } from "lucide-react";
import { queryOne } from "@/lib/db";
import { markAttendance, saveReport, deleteClass, updateClass } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, TextAreaField, SelectField } from "@/components/form-field";
import { CancelClassDialog } from "@/components/cancel-dialog";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { fmtDateTime, fmtDateInput } from "@/lib/format";
import type { ClassRow, Report, Student, Attendance } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  switch (status) {
    case "completed":
    case "present":
      return "default" as const;
    case "canceled":
    case "absent":
      return "destructive" as const;
    case "late":
      return "outline" as const;
    default:
      return "secondary" as const;
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

  return (
    <>
      <PageHeader
        title={
          cls.status === "canceled"
            ? <span className="line-through opacity-60">{student.name} — {fmtDateTime(cls.scheduled_at)}</span>
            : `${student.name} — ${fmtDateTime(cls.scheduled_at)}`
        }
        subtitle={`${cls.duration_minutes} min · ${cls.subject || student.subject || "Lesson"}${cls.location ? " · " + cls.location : ""}${cls.rescheduled_from ? " · [RESCHEDULED]" : ""}`}
        action={
          <div className="flex gap-2">
            {report && (
              <WhatsAppShare
                text={[
                  `📚 Class Report: ${student.name}`,
                  `📅 ${fmtDateTime(cls.scheduled_at)}`,
                  report.topics_covered ? `\n*Topics:* ${report.topics_covered}` : "",
                  report.homework ? `*Homework:* ${report.homework}` : "",
                  report.performance ? `*Performance:* ${report.performance}` : "",
                  report.rating ? `*Rating:* ${report.rating}/5` : "",
                ].filter(Boolean).join("\n")}
              />
            )}
            <Link href={`/students/${student.id}`}>
              <Button variant="secondary">Student profile</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-2">Status</div>
            <div className="flex items-center gap-1.5">
              <Badge variant={statusVariant(cls.status)}>{cls.status}</Badge>
              {cls.is_trial ? <Badge variant="outline" className="border-accent text-accent-foreground">TRIAL</Badge> : null}
            </div>
            {cls.cancel_reason && (
              <div className="text-xs text-muted-foreground mt-2">Reason: {cls.cancel_reason}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-2">Attendance</div>
            {cls.attendance ? (
              <Badge variant={statusVariant(cls.attendance)}>{cls.attendance}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">not marked</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-2">Rate</div>
            <div className="text-sm">
              {Number(student.hourly_rate).toFixed(2)} / hr · {(Number(cls.duration_minutes) / 60).toFixed(2)}h
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="text-sm font-semibold text-foreground mb-3">Attendance</div>
          <div className="flex flex-wrap gap-2">
            <form action={attend.bind(null, "present" as Attendance)}>
              <Button type="submit" variant={cls.attendance === "present" ? "default" : "secondary"}>
                <Check size={16} /> Present
              </Button>
            </form>
            <form action={attend.bind(null, "late" as Attendance)}>
              <Button type="submit" variant={cls.attendance === "late" ? "default" : "secondary"}>
                <Clock size={16} /> Late
              </Button>
            </form>
            <form action={attend.bind(null, "absent" as Attendance)}>
              <Button type="submit" variant={cls.attendance === "absent" ? "default" : "secondary"}>
                <X size={16} /> Absent
              </Button>
            </form>
          </div>
          {cls.status === "scheduled" && (
            <div className="mt-4 pt-4 border-t border-border">
              <CancelClassDialog classId={id} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="text-sm font-semibold text-foreground mb-4">Post-class report</div>
          <form action={saveR}>
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
              <TextAreaField
                label="Overall performance"
                name="performance"
                rows={2}
                defaultValue={report?.performance ?? ""}
              />
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
            <div className="mt-6 flex justify-end">
              <Button type="submit">
                {report ? "Update report" : "Save report"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <details className="mb-6">
        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
          Edit class details
        </summary>
        <Card className="mt-3">
          <CardContent className="pt-5">
            <form action={upd}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Date & time"
                  name="scheduled_at"
                  type="datetime-local"
                  defaultValue={fmtDateInput(cls.scheduled_at)}
                />
                <Field
                  label="Duration"
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
              <div className="mt-6 flex justify-between">
                <Button type="submit" formAction={del} variant="destructive" formNoValidate>
                  <Trash2 size={16} /> Delete class
                </Button>
                <Button type="submit">
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </details>
    </>
  );
}
