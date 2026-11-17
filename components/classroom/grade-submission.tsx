"use client";
import { useActionBusy } from "@/components/action-busy";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareText, Send } from "lucide-react";
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
  useActionBusy(busy, "Returning grade…");
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
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={busy}>
      <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={21} className="text-primary" /> Latest attempt ·{" "}
          {submission.version}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Return a grade for this work. Earlier attempts stay read-only in the
          student's history.
        </p>
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <section className="form-section">
          <label
            htmlFor={`grade-${submission.id}`}
            className="form-section-title block"
          >
            Grade
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
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
              className="min-h-16 w-36 max-w-full rounded-xl border border-input bg-card px-4 text-2xl font-semibold"
            />
            {maxPoints !== null && (
              <span className="text-xl text-muted-foreground">
                / {maxPoints}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {maxPoints !== null
              ? `Choose a score from 0 to ${maxPoints}.`
              : "Add the result you want your student to see."}
          </p>
        </section>
        <section className="form-section space-y-3">
          <label
            htmlFor={`feedback-${submission.id}`}
            className="form-section-title flex items-center gap-2"
          >
            <MessageSquareText size={20} />
            Feedback (optional)
          </label>
          <textarea
            id={`feedback-${submission.id}`}
            name="feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            maxLength={10000}
            rows={5}
            placeholder="Celebrate what went well and suggest a clear next step…"
            className="w-full rounded-xl border border-input bg-card p-4 text-base leading-relaxed"
          />
        </section>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-base text-destructive"
        >
          {error}
        </p>
      )}
      <div className="border-t border-border pt-5">
        <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
          <Send size={18} />
          {busy
            ? "Saving..."
            : submission.graded_at
              ? "Update Grade"
              : "Return"}
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">
          Your student will be notified. If a newer attempt arrives, reload
          before grading.
        </p>
      </div>
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
