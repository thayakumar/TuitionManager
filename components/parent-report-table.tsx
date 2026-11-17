import { TableExplorer } from "@/components/table-explorer";
import { BookOpen, ChevronDown } from "lucide-react";
import { ReportDetails } from "@/components/report-details";
import { RatingBadge } from "@/components/rating-badge";
import { fmtDateTime } from "@/lib/format";

export type ParentReport = {
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
  duration_minutes: number;
};

export function ParentReportTable({ reports }: { reports: ParentReport[] }) {
  if (!reports.length)
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <BookOpen className="mx-auto mb-3 text-primary/60" />
        <h2 className="font-semibold">No class reports yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your tutor's lesson updates will appear here.
        </p>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <TableExplorer><table className="w-full text-left text-sm">
        <caption className="sr-only">
          Class reports. Expand a lesson to read its full report.
        </caption>
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Lesson</th>
            <th className="hidden px-3 py-3 font-medium sm:table-cell">
              Duration
            </th>
            <th className="hidden px-3 py-3 font-medium sm:table-cell">
              Rating
            </th>
            <th className="px-4 py-3 text-right font-medium">Report</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-t border-border"
              data-table-search={[report.scheduled_at,fmtDateTime(report.scheduled_at),report.duration_minutes,report.rating,report.topics_covered,report.homework,report.performance,report.strengths,report.areas_to_improve,report.next_focus].join(" ")}
              data-table-columns={JSON.stringify([fmtDateTime(report.scheduled_at),`${report.duration_minutes} min`,report.rating ? `${report.rating}/5` : "Not rated",[report.topics_covered,report.homework,report.performance,report.strengths,report.areas_to_improve,report.next_focus].join(" ")])}>
              <td colSpan={4} className="p-0">
                <details className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[minmax(0,1fr)_100px_90px_100px]">
                    <span>
                      <span className="block font-medium">
                        {fmtDateTime(report.scheduled_at)}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground sm:hidden">
                        {report.duration_minutes} minutes
                      </span>
                      <span className="mt-2 inline-flex sm:hidden">
                        <RatingBadge rating={report.rating} />
                      </span>
                    </span>
                    <span className="hidden text-muted-foreground sm:block">
                      {report.duration_minutes} min
                    </span>
                    <span className="hidden items-center gap-1 sm:flex">
                      <RatingBadge rating={report.rating} />
                    </span>
                    <span className="flex items-center justify-end gap-1 text-xs font-medium text-primary">
                      <span className="group-open:hidden">Read report</span>
                      <span className="hidden group-open:inline">
                        Close report
                      </span>
                      <ChevronDown
                        size={14}
                        className="transition-transform group-open:rotate-180"
                      />
                    </span>
                  </summary>
                  <div className="border-t border-border bg-white p-4">
                    <ReportDetails report={report} />
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table></TableExplorer>
    </div>
  );
}
