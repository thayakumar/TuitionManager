"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { gradeSubmissionResult as gradeSubmissionAction } from "@/lib/actions";
import { toast } from "sonner";
import type { Submission } from "@/lib/types";
import { actionError, ActionValidationError } from "@/lib/action-errors";
import { AttemptWork } from "./submission-history";

export function GradeSubmissionForm({
  submission,
  maxPoints,
  studentId,
}: {
  submission: Submission & { version: number };
  maxPoints: number | null;
  studentId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [grade, setGrade] = useState(submission.grade ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState("");
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const value = grade.trim();
    if (!value) {
      setError("Enter a grade.");
      return;
    }
    if (
      maxPoints !== null &&
      (!Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > maxPoints)
    ) {
      setError(`Enter a score from 0 to ${maxPoints}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await gradeSubmissionAction(
        submission.id,
        value,
        feedback,
        studentId,
        submission.version,
      );
      if (result && !result.success)
        throw new ActionValidationError(
          result.error || "Could not save this grade.",
        );
      toast.success("Grade returned successfully");
      router.refresh();
    } catch (reason) {
      setError(
        actionError(
          reason,
          "Could not save this grade. Reload to check the latest attempt.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Grading attempt {submission.version}. If newer work arrives, reload
        before grading.
      </p>
      <div className="space-y-1.5">
        <label
          htmlFor={`grade-${submission.id}`}
          className="text-sm font-medium"
        >
          Grade
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`grade-${submission.id}`}
            name="grade"
            type={maxPoints !== null ? "number" : "text"}
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            required
            min={maxPoints !== null ? 0 : undefined}
            max={maxPoints ?? undefined}
            step="any"
            maxLength={100}
            disabled={busy}
            className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
          />
          {maxPoints !== null && (
            <span className="text-sm text-muted-foreground">/ {maxPoints}</span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`feedback-${submission.id}`}
          className="text-sm font-medium"
        >
          Feedback (optional)
        </label>
        <textarea
          id={`feedback-${submission.id}`}
          name="feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          maxLength={10000}
          rows={3}
          disabled={busy}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving..." : submission.graded_at ? "Update Grade" : "Return"}
      </Button>
    </form>
  );
}

export function SubmissionCard({
  submission,
  maxPoints,
}: {
  submission: Submission & { version: number };
  maxPoints: number | null;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">
        Latest attempt · {submission.version}
      </p>
      <AttemptWork attempt={submission} maxPoints={maxPoints} />
    </div>
  );
}
