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
        className="border-b border-border/50 hover:bg-indigo-50/30 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
          <Link
            href={`/classes/${r.class_id}`}
            className="hover:text-indigo-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {fmtDateTime(r.scheduled_at)}
          </Link>
        </td>
        <td className="py-2.5 px-3 text-foreground truncate max-w-[200px]">
          {r.topics_covered || "—"}
        </td>
        <td className="py-2.5 px-3 text-center">
          {r.rating != null ? (
            <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium">
              {r.rating}/5
            </span>
          ) : "—"}
        </td>
        <td className="py-2.5 px-3 text-center">
          {open ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border/50 bg-indigo-50/20">
          <td colSpan={4} className="px-3 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-foreground whitespace-pre-line">{value}</p>
    </div>
  );
}
