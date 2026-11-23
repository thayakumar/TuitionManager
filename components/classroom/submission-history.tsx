import { AttachmentCard } from "@/components/attachment-preview";
import { attachmentHref } from "@/lib/attachment-url";
import { RichText } from "@/components/rich-text";
import { fmtDateTime } from "@/lib/format";
import { safeUrl } from "@/lib/domain/validation";
import type { SubmissionAttempt } from "@/lib/types";

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
        <AttachmentCard
          fileUrl={attempt.file_url!}
          fileName="Submitted attachment"
          submitted
        />
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
