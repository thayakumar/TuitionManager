"use client";
import { useActionBusy } from "@/components/action-busy";
import { actionError } from "@/lib/action-errors";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { stopRecurrence, extendRecurrence } from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Repeat2, CalendarCheck2, Archive } from "lucide-react";
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
  const [confirmation, setConfirmation] = useState<{
    series: Series;
    kind: "stop" | "extend";
  } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  useActionBusy(busy !== null, "Updating recurring lessons…");
  const [error, setError] = useState<string | null>(null);
  async function save(r: Series, kind: "stop" | "extend") {
    const horizon = r.generated_through || r.end_date || r.start_date;
    const nextEnd = `${Number(horizon.slice(0, 4)) + 1}-12-31`;
    setBusy(r.id);
    setError(null);
    try {
      if (kind === "stop") await stopRecurrence(r.id);
      else await extendRecurrence(r.id, nextEnd);
      setConfirmation(null);
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Unable to update this series. Try again."));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-4">
      {error && !confirmation && (
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
      <Dialog
        open={confirmation !== null}
        onOpenChange={(value) => {
          if (!value && busy === null) setConfirmation(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {confirmation?.kind === "stop"
                ? "Stop future lessons?"
                : "Extend this series?"}
            </DialogTitle>
            <DialogDescription>
              {confirmation?.kind === "stop"
                ? "End the recurring schedule while keeping its history."
                : "Continue the same teaching rhythm into next year."}
            </DialogDescription>
          </DialogHeader>
          {confirmation && (
            <>
              <section className="form-section">
                <div className="flex items-start gap-4">
                  {confirmation.kind === "stop" ? (
                    <Archive size={26} className="shrink-0 text-primary" />
                  ) : (
                    <CalendarCheck2
                      size={26}
                      className="shrink-0 text-primary"
                    />
                  )}
                  <div>
                    <h3 className="form-section-title">
                      {confirmation.series.student_name}
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      {days[confirmation.series.day_of_week]} ·{" "}
                      {confirmation.series.time} MYT ·{" "}
                      {confirmation.series.duration_minutes} minutes
                    </p>
                  </div>
                </div>
                <p className="mt-5 leading-relaxed">
                  {confirmation.kind === "stop"
                    ? "Future generated lessons in this series will be cancelled. Past lessons, reports, attendance and invoices are preserved."
                    : `Lessons will be generated through 31 December ${Number((confirmation.series.generated_through || confirmation.series.end_date || confirmation.series.start_date).slice(0, 4)) + 1}. Existing lessons will not be duplicated, and timetable clashes are checked before saving.`}
                </p>
              </section>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 p-4 text-destructive"
                >
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => setConfirmation(null)}
                >
                  Go back
                </Button>
                <Button
                  type="button"
                  variant={
                    confirmation.kind === "stop" ? "destructive" : "default"
                  }
                  disabled={busy !== null}
                  onClick={() => save(confirmation.series, confirmation.kind)}
                >
                  {busy !== null
                    ? "Saving…"
                    : confirmation.kind === "stop"
                      ? "Stop future lessons"
                      : "Confirm extension"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {series.map((r) => (
        <section key={r.id} className="rounded-2xl border bg-card p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-3 text-xl font-semibold">
                <Repeat2 size={23} className="text-primary" />
                {r.student_name}
              </h2>
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
                  onClick={() => {
                    setError(null);
                    setConfirmation({ series: r, kind: "extend" });
                  }}
                >
                  {busy === r.id ? "Saving…" : "Extend through next year"}
                </Button>
                <Button
                  disabled={busy !== null}
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    setConfirmation({ series: r, kind: "stop" });
                  }}
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
