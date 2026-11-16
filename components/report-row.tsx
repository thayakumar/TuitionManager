"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
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
          {r.rating != null ? (
            <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium">
              {r.rating}/5
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="py-4 px-5 text-center">
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg hover:bg-primary/10"
            aria-expanded={open}
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
        <tr className="border-b border-border/50 bg-primary/5">
          <td colSpan={4} className="px-5 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
              <DetailItem label="Subject" value={r.subject || defaultSubject} />
              <DetailItem label="Topics Covered" value={r.topics_covered} />
              <DetailItem label="Homework" value={r.homework} />
              <DetailItem label="Performance" value={r.performance} />
              <DetailItem label="Strengths" value={r.strengths} />
              <DetailItem label="Areas to Improve" value={r.areas_to_improve} />
              <DetailItem label="Next Focus" value={r.next_focus} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-sm font-semibold text-muted-foreground tracking-wide mb-2">
        {label}
      </p>
      <p className="text-foreground whitespace-pre-line">{value}</p>
    </div>
  );
}
