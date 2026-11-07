import { notFound } from "next/navigation";
import {
  Check, Clock, X, TrendingUp,
} from "lucide-react";
import { queryOne, queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import type { ClassRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParentAttendancePage({ params }: { params: { token: string } }) {
  const shareToken = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM share_tokens WHERE token = ? AND active = 1",
    [params.token]
  );
  if (!shareToken) notFound();

  const studentId = shareToken.student_id;

  const [classes, stats] = await Promise.all([
    queryAll<ClassRow>(
      "SELECT * FROM classes WHERE student_id = ? ORDER BY scheduled_at DESC",
      [studentId]
    ),
    queryOne<{ total: number; present: number; late: number; absent: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN attendance = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN attendance = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN attendance = 'absent' THEN 1 ELSE 0 END) as absent
       FROM classes WHERE student_id = ? AND status != 'scheduled'`,
      [studentId]
    ),
  ]);

  const completed = (stats?.present ?? 0) + (stats?.late ?? 0) + (stats?.absent ?? 0);
  const rate = completed > 0
    ? Math.round(((stats!.present + stats!.late) / completed) * 100)
    : 0;

  return (
    <>
      <PageHeader title="Attendance" subtitle="Track attendance across all classes" />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 mx-auto mb-2">
              <Check size={16} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.present ?? 0}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 mx-auto mb-2">
              <Clock size={16} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.late ?? 0}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-50 mx-auto mb-2">
              <X size={16} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.absent ?? 0}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 mx-auto mb-2">
              <TrendingUp size={16} className="text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{rate}%</p>
            <p className="text-xs text-muted-foreground">Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Class List */}
      <div className="space-y-2">
        {classes.map((c) => {
          const attColor = c.attendance === "present"
            ? "bg-emerald-500 hover:bg-emerald-600"
            : c.attendance === "late"
            ? "bg-amber-500 hover:bg-amber-600"
            : c.attendance === "absent"
            ? "bg-red-500 hover:bg-red-600"
            : "";

          return (
            <Card key={c.id} className="shadow-sm border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 items-center justify-center rounded-lg ${
                    c.attendance === "present" ? "bg-emerald-50" :
                    c.attendance === "late" ? "bg-amber-50" :
                    c.attendance === "absent" ? "bg-red-50" : "bg-gray-50"
                  }`}>
                    {c.attendance === "present" ? <Check size={16} className="text-emerald-500" /> :
                     c.attendance === "late" ? <Clock size={16} className="text-amber-500" /> :
                     c.attendance === "absent" ? <X size={16} className="text-red-500" /> :
                     <Clock size={16} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${c.status === "canceled" ? "line-through opacity-60" : ""}`}>
                      {fmtDateTime(c.scheduled_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.duration_minutes} min · {c.subject || "Lesson"}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {c.attendance && (
                      <Badge className={`text-[10px] text-white capitalize ${attColor}`}>
                        {c.attendance}
                      </Badge>
                    )}
                    <Badge
                      variant={c.status === "completed" ? "default" : c.status === "canceled" ? "destructive" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {c.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
