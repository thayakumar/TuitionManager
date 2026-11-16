"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ReportDetails } from "@/components/report-details";
import { RatingBadge } from "@/components/rating-badge";
import { fmtDateTime } from "@/lib/format";

type ReportData = {
  id: number;
  class_id: number;
  scheduled_at: string;
  subject: string | null;
  topics_covered: string | null;
  homework: string | null;
  performance: string | null;
  strengths: string | null;
  areas_to_improve: string | null;
  next_focus: string | null;
  rating: number | null;
};

export function ReportRow({
  report: r,
  defaultSubject,
}: {
  report: ReportData;
  defaultSubject: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="border-b border-border/50 hover:bg-primary/5 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="py-4 px-5 text-muted-foreground whitespace-nowrap">
          <Link
            href={`/classes/${r.class_id}`}
            className="hover:text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {fmtDateTime(r.scheduled_at)}
          </Link>
        </td>
        <td className="py-4 px-5 text-foreground truncate max-w-[200px]">
          {r.topics_covered || "—"}
        </td>
        <td className="py-4 px-5 text-center">
          <RatingBadge rating={r.rating} />
        </td>
        <td className="py-4 px-5 text-center">
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg hover:bg-primary/10"
            aria-expanded={open}
            aria-controls={`report-details-${r.id}`}
            aria-label={`${open ? "Collapse" : "Expand"} report for ${fmtDateTime(r.scheduled_at)}`}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? (
              <ChevronDown size={20} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={20} className="text-muted-foreground" />
            )}
          </button>
        </td>
      </tr>
      {open && (
        <tr
          id={`report-details-${r.id}`}
          className="border-b border-border/50 bg-white"
        >
          <td colSpan={4} className="px-5 py-5">
            <ReportDetails report={r} subject={r.subject || defaultSubject} />
          </td>
        </tr>
      )}
    </>
  );
}
