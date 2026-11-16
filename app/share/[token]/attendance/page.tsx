import { lessonStatus } from "@/lib/lesson-status";
import { queryAll, queryOne } from "@/lib/db";
import {
  requireParent,
  PUBLIC_LESSON_COLUMNS,
  attendanceSummary,
  normalizedAttendance,
} from "@/lib/portal-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import type { ClassRow } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function ParentAttendancePage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>;
}) {
  const params = await paramsPromise;
  const student = await requireParent(params.token);
  const [classes, stats] = await Promise.all([
    queryAll<ClassRow>(
      `SELECT ${PUBLIC_LESSON_COLUMNS} FROM classes WHERE student_id=? ORDER BY scheduled_at DESC`,
      [student.id],
    ),
    queryOne<{ present: number; absent: number; cancelled: number }>(
      `SELECT SUM(CASE WHEN status<>'canceled' AND attendance IN ('present','late') THEN 1 ELSE 0 END) AS present,SUM(CASE WHEN status<>'canceled' AND attendance='absent' THEN 1 ELSE 0 END) AS absent,SUM(CASE WHEN status='canceled' THEN 1 ELSE 0 END) AS cancelled FROM classes WHERE student_id=?`,
      [student.id],
    ),
  ]);
  const summary = attendanceSummary(stats?.present ?? 0, stats?.absent ?? 0);
  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Present and Absent count toward attendance; advance-notice cancellations do not."
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Present", summary.present],
          ["Absent", summary.absent],
          ["Cancelled", stats?.cancelled ?? 0],
          ["Attendance", `${summary.rate}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {classes.length ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Lesson</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Duration
                </th>
                <th className="px-4 py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                const label =
                  c.status === "canceled"
                    ? "Cancelled"
                    : normalizedAttendance(c.attendance) === "present"
                      ? "Present"
                      : c.attendance === "absent"
                        ? "Absent"
                        : "Not marked";
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-4">
                      <p
                        className={`font-medium ${c.status === "canceled" ? "text-muted-foreground line-through" : ""}`}
                      >
                        {fmtDateTime(c.scheduled_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                        {c.duration_minutes} minutes
                      </p>
                      {c.status === "canceled" && c.cancel_reason && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c.cancel_reason}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-4 text-muted-foreground sm:table-cell">
                      {c.duration_minutes} min
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className={lessonStatus(c.status, c.attendance).className}>{label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No lessons recorded yet
        </div>
      )}
    </>
  );
}
