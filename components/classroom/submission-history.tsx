import { Paperclip, ExternalLink } from "lucide-react";
import { attachmentHref } from "@/lib/attachment-url";
import { RichText } from "@/components/rich-text";
import { fmtDateTime } from "@/lib/format";
import { safeUrl } from "@/lib/domain/validation";

export type SubmissionAttempt = {
  version: number;
  max_points?: number | null;
  content: string | null;
  file_url: string | null;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
};

export function safeSubmissionHref(value: string | null): string | null {
  try {
    const url = safeUrl(value);
    return url ? attachmentHref(url) : null;
  } catch {
    return null;
  }
}

export function AttemptWork({
  attempt,
  maxPoints,
  historical = false,
}: {
  attempt: SubmissionAttempt;
  maxPoints: number | null;
  historical?: boolean;
}) {
  const href = safeSubmissionHref(attempt.file_url);
  const recordedMaximum =
    attempt.max_points === undefined ? maxPoints : attempt.max_points;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Submitted {fmtDateTime(attempt.submitted_at)}
      </p>
      {attempt.content && (
        <RichText
          content={attempt.content}
          className="rounded-lg border border-border p-3 text-base"
        />
      )}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-16 items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-blue-900 hover:bg-blue-50"
        >
          <Paperclip size={22} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <strong className="block">Submitted attachment</strong>
            <span className="text-sm underline">Open attached work</span>
          </span>
          <ExternalLink size={18} className="shrink-0" />
        </a>
      ) : attempt.file_url ? (
        <p className="text-sm text-muted-foreground">
          This attachment link is unavailable.
        </p>
      ) : null}
      {attempt.graded_at ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">
            Grade: {attempt.grade ?? "—"}
            {recordedMaximum !== null ? `/${recordedMaximum}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Graded {fmtDateTime(attempt.graded_at)}
          </p>
          {attempt.feedback && (
            <p className="mt-2 whitespace-pre-wrap">{attempt.feedback}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {historical
            ? "Superseded before grading; this attempt is read-only."
            : "Awaiting grading"}
        </p>
      )}
    </div>
  );
}

export function SubmissionHistory({
  attempts,
  latestVersion,
  maxPoints,
}: {
  attempts: SubmissionAttempt[];
  latestVersion: number;
  maxPoints: number | null;
}) {
  const previous = attempts.filter(
    (attempt) => attempt.version < latestVersion,
  );
  if (!previous.length) return null;
  return (
    <section className="space-y-3 border-t border-border pt-5">
      <h3 className="font-semibold">Submission history</h3>
      <p className="text-sm text-muted-foreground">
        Earlier work and feedback remain available. Only the latest attempt can
        be graded.
      </p>
      {previous.map((attempt) => (
        <details
          key={attempt.version}
          className="rounded-lg border border-border p-3"
        >
          <summary className="cursor-pointer text-sm font-medium">
            Attempt {attempt.version} ·{" "}
            {attempt.graded_at ? "Graded" : "Superseded without grading"} ·{" "}
            {fmtDateTime(attempt.submitted_at)}
          </summary>
          <div className="mt-3">
            <AttemptWork attempt={attempt} maxPoints={maxPoints} historical />
          </div>
        </details>
      ))}
    </section>
  );
}
