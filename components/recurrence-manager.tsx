"use client";
import { actionError } from "@/lib/action-errors";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { stopRecurrence, extendRecurrence } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";

type Series = {
  id: number;
  student_name: string;
  day_of_week: number;
  time: string;
  frequency: string;
  active: number;
  generated_through: string | null;
  end_date: string | null;
  start_date: string;
  duration_minutes: number;
};
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export function RecurrenceManager({ series }: { series: Series[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function save(r: Series, kind: "stop" | "extend") {
    const horizon = r.generated_through || r.end_date || r.start_date;
    const nextEnd = `${Number(horizon.slice(0, 4)) + 1}-12-31`;
    const message =
      kind === "stop"
        ? "Cancel future lessons in this series? Past lessons and reports will be preserved."
        : `Generate this series through 31 December ${nextEnd.slice(0, 4)}? Existing lessons will not be duplicated.`;
    if (!window.confirm(message)) return;
    setBusy(r.id);
    setError(null);
    try {
      if (kind === "stop") await stopRecurrence(r.id);
      else await extendRecurrence(r.id, nextEnd);
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Unable to update this series. Try again."));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {!series.length && (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No recurring series yet. Create one to generate lessons through the
          chosen year.
        </p>
      )}
      {series.map((r) => (
        <section key={r.id} className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">{r.student_name}</h2>
              <p className="text-sm text-muted-foreground">
                {days[r.day_of_week]} · {r.time} MYT · {r.duration_minutes}{" "}
                minutes · {r.frequency}
              </p>
              <p className="mt-2 text-sm">
                Generated through{" "}
                {fmtDate(
                  `${r.generated_through || r.end_date || r.start_date}T12:00:00+08:00`,
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.active
                  ? "Active series"
                  : "Stopped — historical lessons preserved"}
              </p>
            </div>
            {!!r.active && (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy !== null}
                  variant="outline"
                  onClick={() => save(r, "extend")}
                >
                  {busy === r.id ? "Saving…" : "Extend through next year"}
                </Button>
                <Button
                  disabled={busy !== null}
                  variant="outline"
                  onClick={() => save(r, "stop")}
                >
                  Stop future lessons
                </Button>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
