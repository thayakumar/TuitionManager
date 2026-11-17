"use client";

import { useState, Fragment } from "react";
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
  const [expanded, setExpanded] = useState<number | null>(null);
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
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <TableExplorer label="class reports">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Class reports. Expand a lesson to read its full report.
          </caption>
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-4 font-medium">Lesson</th>
              <th className="p-4 font-medium">Duration</th>
              <th className="p-4 font-medium">Rating</th>
              <th className="p-4 text-right font-medium">Report</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const open = expanded === report.id;
              return (
                <Fragment key={report.id}>
                  <tr
                    className="border-b border-border/70"
                    data-table-search={[
                      report.scheduled_at,
                      fmtDateTime(report.scheduled_at),
                      report.duration_minutes,
                      report.rating ? `${report.rating}/5` : "Not rated",
                      report.topics_covered,
                      report.homework,
                      report.performance,
                      report.strengths,
                      report.areas_to_improve,
                      report.next_focus,
                    ].join(" ")}
                    data-table-columns={JSON.stringify([
                      fmtDateTime(report.scheduled_at),
                      `${report.duration_minutes} min`,
                      report.rating ? `${report.rating}/5` : "Not rated",
                      [
                        report.topics_covered,
                        report.homework,
                        report.performance,
                        report.strengths,
                        report.areas_to_improve,
                        report.next_focus,
                      ].join(" "),
                    ])}
                  >
                    <td className="p-4 font-medium">
                      {fmtDateTime(report.scheduled_at)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {report.duration_minutes} min
                    </td>
                    <td className="p-4">
                      <RatingBadge rating={report.rating} />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`parent-report-${report.id}`}
                        onClick={() => setExpanded(open ? null : report.id)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 font-medium text-primary hover:bg-secondary"
                      >
                        {open ? "Close report" : "Read report"}
                        <ChevronDown
                          size={17}
                          className={open ? "rotate-180" : ""}
                        />
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr id={`parent-report-${report.id}`} data-table-detail>
                      <td
                        colSpan={4}
                        className="border-b border-border bg-secondary/30 p-5"
                      >
                        <ReportDetails report={report} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </TableExplorer>
    </div>
  );
}
