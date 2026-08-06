import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, Clock, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { markAttendance, saveReport, deleteClass, updateClass } from "@/lib/actions";
import {
  PageHeader,
  Card,
  Field,
  TextArea,
  Button,
  Badge,
  Select,
} from "@/components/ui";
import { fmtDateTime, fmtDateInput } from "@/lib/format";
import type { ClassRow, Report, Student, Attendance } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const cls = db().prepare("SELECT * FROM classes WHERE id = ?").get(id) as
    | ClassRow
    | undefined;
  if (!cls) notFound();

  const student = db()
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(cls.student_id) as Student;

  const report = db()
    .prepare("SELECT * FROM reports WHERE class_id = ?")
    .get(id) as Report | undefined;

  const attend = markAttendance.bind(null, id);
  const saveR = saveReport.bind(null, id);
  const upd = updateClass.bind(null, id);
  const del = deleteClass.bind(null, id);

  return (
    <>
      <PageHeader
        title={`${student.name} — ${fmtDateTime(cls.scheduled_at)}`}
        subtitle={`${cls.duration_minutes} min · ${cls.subject || student.subject || "Lesson"}${cls.location ? " · " + cls.location : ""}`}
        action={
          <div className="flex gap-2">
            <Link href={`/students/${student.id}`}>
              <Button variant="secondary">Student profile</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs text-slate-500 mb-2">Status</div>
          <Badge
            tone={
              cls.status === "completed"
                ? "green"
                : cls.status === "canceled"
                  ? "red"
                  : "blue"
            }
          >
            {cls.status}
          </Badge>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 mb-2">Attendance</div>
          {cls.attendance ? (
            <Badge tone={cls.attendance === "present" ? "green" : cls.attendance === "late" ? "yellow" : "red"}>
              {cls.attendance}
            </Badge>
          ) : (
            <span className="text-sm text-slate-400">not marked</span>
          )}
        </Card>
        <Card>
          <div className="text-xs text-slate-500 mb-2">Rate</div>
          <div className="text-sm">
            {student.hourly_rate.toFixed(2)} / hr · {(cls.duration_minutes / 60).toFixed(2)}h
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="text-sm font-semibold text-slate-700 mb-3">Attendance</div>
        <div className="flex flex-wrap gap-2">
          <form action={attend.bind(null, "present" as Attendance)}>
            <Button type="submit" variant={cls.attendance === "present" ? "primary" : "secondary"}>
              <Check size={16} /> Present
            </Button>
          </form>
          <form action={attend.bind(null, "late" as Attendance)}>
            <Button type="submit" variant={cls.attendance === "late" ? "primary" : "secondary"}>
              <Clock size={16} /> Late
            </Button>
          </form>
          <form action={attend.bind(null, "absent" as Attendance)}>
            <Button type="submit" variant={cls.attendance === "absent" ? "primary" : "secondary"}>
              <X size={16} /> Absent
            </Button>
          </form>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="text-sm font-semibold text-slate-700 mb-4">Post-class report</div>
        <form action={saveR}>
          <div className="grid grid-cols-1 gap-4">
            <TextArea
              label="Topics covered"
              name="topics_covered"
              rows={3}
              defaultValue={report?.topics_covered ?? ""}
              placeholder="What was taught this class"
            />
            <TextArea
              label="Homework assigned"
              name="homework"
              rows={2}
              defaultValue={report?.homework ?? ""}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextArea
                label="Strengths"
                name="strengths"
                rows={2}
                defaultValue={report?.strengths ?? ""}
              />
              <TextArea
                label="Areas to improve"
                name="areas_to_improve"
                rows={2}
                defaultValue={report?.areas_to_improve ?? ""}
              />
            </div>
            <TextArea
              label="Overall performance"
              name="performance"
              rows={2}
              defaultValue={report?.performance ?? ""}
            />
            <TextArea
              label="Focus for next class"
              name="next_focus"
              rows={2}
              defaultValue={report?.next_focus ?? ""}
            />
            <Select
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
            <Button type="submit" variant="primary">
              {report ? "Update report" : "Save report"}
            </Button>
          </div>
        </form>
      </Card>

      <details className="mb-6">
        <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-900">
          Edit class details
        </summary>
        <Card className="mt-3">
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
                defaultValue={cls.duration_minutes}
              />
              <Field label="Subject" name="subject" defaultValue={cls.subject ?? ""} />
              <Field label="Location" name="location" defaultValue={cls.location ?? ""} />
              <Select
                label="Status"
                name="status"
                defaultValue={cls.status}
                options={[
                  { value: "scheduled", label: "Scheduled" },
                  { value: "completed", label: "Completed" },
                  { value: "canceled", label: "Canceled" },
                ]}
              />
              <Select
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
              <Button type="submit" formAction={del} variant="danger" formNoValidate>
                <Trash2 size={16} /> Delete class
              </Button>
              <Button type="submit" variant="primary">
                Save
              </Button>
            </div>
          </form>
        </Card>
      </details>
    </>
  );
}
