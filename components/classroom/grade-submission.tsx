"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gradeSubmissionAction } from "@/lib/actions";
import { fmtDateTime } from "@/lib/format";
import type { Submission } from "@/lib/types";

const inputClass =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function GradeSubmissionForm({
  submission,
  maxPoints,
  studentId,
}: {
  submission: Submission;
  maxPoints: number | null;
  studentId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [grade, setGrade] = useState(submission.grade || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");

  function handleSubmit() {
    startTransition(async () => {
      await gradeSubmissionAction(submission.id, grade, feedback, studentId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {submission.graded_at && (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 size={14} />
          Graded on {fmtDateTime(submission.graded_at)}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">Grade</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type={maxPoints ? "number" : "text"}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            min={0}
            max={maxPoints || undefined}
            placeholder={maxPoints ? "0" : "e.g., A+"}
            className={`${inputClass} w-24`}
          />
          {maxPoints && (
            <span className="text-sm text-muted-foreground">/ {maxPoints}</span>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Feedback <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          placeholder="Add feedback for the student..."
          className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Button onClick={handleSubmit} disabled={isPending || !grade.trim()}>
        {isPending
          ? "Saving..."
          : submission.graded_at
            ? "Update Grade"
            : "Return"}
      </Button>
    </div>
  );
}

export function SubmissionCard({
  submission,
  maxPoints,
}: {
  submission: Submission;
  maxPoints: number | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          Submitted {fmtDateTime(submission.submitted_at)}
        </span>
        {submission.graded_at ? (
          <Badge className="text-[10px] bg-emerald-500 text-white">Graded</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">Turned in</Badge>
        )}
        {submission.grade && (
          <Badge variant="outline" className="text-[10px] font-mono">
            {submission.grade}{maxPoints ? `/${maxPoints}` : ""}
          </Badge>
        )}
      </div>

      {submission.content && (
        <div className="rounded-lg border border-border/50 p-3">
          <p className="text-sm whitespace-pre-line">{submission.content}</p>
        </div>
      )}

      {submission.file_url && (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">Link submitted</p>
          <a
            href={/^https?:\/\//i.test(submission.file_url) ? submission.file_url : `https://${submission.file_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
          >
            {submission.file_url.length > 80 ? submission.file_url.slice(0, 80) + "…" : submission.file_url}
          </a>
        </div>
      )}

      {submission.feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-xs font-medium text-emerald-700 mb-1">Feedback</p>
          <p className="text-sm whitespace-pre-line">{submission.feedback}</p>
        </div>
      )}
    </div>
  );
}
