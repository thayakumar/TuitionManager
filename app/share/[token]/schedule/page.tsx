import { requireParent, PUBLIC_LESSON_COLUMNS } from "@/lib/portal-context";
import { Calendar, Clock } from "lucide-react";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import type { ClassRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParentSchedulePage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>;
}) {
  const params = await paramsPromise;
  const student = await requireParent(params.token);
  const studentId = student.id;

  const now = new Date().toISOString();

  const upcoming = await queryAll<ClassRow>(
    `SELECT ${PUBLIC_LESSON_COLUMNS} FROM classes WHERE student_id = ? AND julianday(scheduled_at) >= julianday(?) AND status = 'scheduled' ORDER BY julianday(scheduled_at)`,
    [studentId, now],
  );

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle={`${student.name}'s class schedule`}
      />

      {/* Upcoming */}
      <Card className="border shadow-none mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar size={18} className="text-orange-500" />
            Upcoming ({upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No upcoming lessons scheduled</p>
              <p className="mt-2 text-sm">
                Your tutor’s next scheduled lessons will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
                >
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
                    <LessonStatusBadge
                      status={c.status}
                      attendance={c.attendance}
                    />
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
