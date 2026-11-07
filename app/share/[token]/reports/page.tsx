import { notFound } from "next/navigation";
import {
  MessageSquare, BookOpen, Brain, Target, Star,
} from "lucide-react";
import { queryOne, queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type ReportWithClass = {
  id: number;
  class_id: number;
  topics_covered: string | null;
  homework: string | null;
  performance: string | null;
  strengths: string | null;
  areas_to_improve: string | null;
  next_focus: string | null;
  rating: number | null;
  scheduled_at: string;
  subject: string | null;
  duration_minutes: number;
};

export default async function ParentReportsPage({ params }: { params: { token: string } }) {
  const shareToken = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM share_tokens WHERE token = ? AND active = 1",
    [params.token]
  );
  if (!shareToken) notFound();

  const reports = await queryAll<ReportWithClass>(
    `SELECT r.*, c.scheduled_at, c.subject, c.duration_minutes
     FROM reports r
     JOIN classes c ON c.id = r.class_id
     WHERE c.student_id = ?
     ORDER BY c.scheduled_at DESC`,
    [shareToken.student_id]
  );

  return (
    <>
      <PageHeader
        title="Class Reports"
        subtitle={`${reports.length} report${reports.length !== 1 ? "s" : ""} from completed classes`}
      />

      {reports.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="p-8 text-center">
            <MessageSquare size={40} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No class reports yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <Card key={r.id} className="shadow-sm border-0 overflow-hidden">
              <div className="border-l-4 border-indigo-500">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {r.subject || "Lesson"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDateTime(r.scheduled_at)} · {r.duration_minutes} min
                      </p>
                    </div>
                    {r.rating && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < r.rating! ? "text-amber-400 fill-amber-400" : "text-gray-200"}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content sections */}
                  <div className="space-y-3 mt-1">
                    {r.topics_covered && (
                      <div className="rounded-lg bg-secondary/40 px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BookOpen size={12} className="text-indigo-500" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Topics Covered</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{r.topics_covered}</p>
                      </div>
                    )}

                    {r.homework && (
                      <div className="rounded-lg bg-amber-50 px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Target size={12} className="text-amber-500" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Homework</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{r.homework}</p>
                      </div>
                    )}

                    {r.performance && (
                      <div className="rounded-lg bg-purple-50 px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Brain size={12} className="text-purple-500" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">Performance</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{r.performance}</p>
                      </div>
                    )}

                    {(r.strengths || r.areas_to_improve) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {r.strengths && (
                          <div className="rounded-lg bg-emerald-50 px-3.5 py-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Strengths</span>
                            <p className="text-sm text-foreground mt-1 whitespace-pre-line">{r.strengths}</p>
                          </div>
                        )}
                        {r.areas_to_improve && (
                          <div className="rounded-lg bg-rose-50 px-3.5 py-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Areas to Improve</span>
                            <p className="text-sm text-foreground mt-1 whitespace-pre-line">{r.areas_to_improve}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {r.next_focus && (
                      <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3.5 py-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Next Focus</span>
                        <p className="text-sm text-indigo-900 mt-1 whitespace-pre-line">{r.next_focus}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
