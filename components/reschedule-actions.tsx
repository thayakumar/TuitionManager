"use client";

import { useRef, useState, useTransition } from "react";
import { useActionBusy } from "@/components/action-busy";
import { Check, X, CalendarClock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveRescheduleRequest,
  rejectRescheduleRequest,
} from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { actionError } from "@/lib/action-errors";
import { fmtDateTime, fmtDateInput } from "@/lib/format";

import { DateTimeField } from "@/components/scheduling-fields";

export function RescheduleActions({
  requestId,
  preferredTimes,
  studentName,
  originalTime,
  reason,
}: {
  requestId: number;
  preferredTimes: string[];
  studentName?: string;
  originalTime?: string;
  reason?: string | null;
}) {
  const customTimeRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [selectedTime, setSelectedTime] = useState(preferredTimes[0]);
  const [note, setNote] = useState("");
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  useActionBusy(
    isPending || refreshing,
    mode === "approve" ? "Rescheduling the lesson…" : "Updating the request…",
  );

  async function resolve(approved: boolean) {
    if (isPending || refreshing) return;
    setPending(true);
    setError(null);
    try {
      const result = approved
        ? await approveRescheduleRequest(
            requestId,
            selectedTime === "__custom"
              ? (customTimeRef.current?.querySelector<HTMLInputElement>(
                  'input[name="approved_custom_time"]',
                )?.value ?? "")
              : selectedTime,
            note || null,
          )
        : await rejectRescheduleRequest(requestId, note || null);
      if (!result?.success) {
        setError(result?.error || "The request could not be resolved.");
        return;
      }
      toast.success(
        approved
          ? "Request approved — lesson rescheduled"
          : "Request declined — original lesson unchanged",
      );
      setMode("idle");
      startRefresh(() => router.refresh());
    } catch (error) {
      setError(
        actionError(
          error,
          "The request could not be resolved. Please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  const handleApprove = () => resolve(true);
  const handleReject = () => resolve(false);

  const triggerButtons = (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => setMode("approve")} disabled={isPending}>
        <Check size={14} /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setMode("reject")}
        disabled={isPending}
      >
        <X size={14} /> Reject
      </Button>
    </div>
  );

  return (
    <>
      {triggerButtons}
      <Dialog
        open={mode !== "idle"}
        onOpenChange={(value) => {
          if (!value && !isPending) {
            setMode("idle");
            setError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "approve"
                ? "Choose the new lesson time"
                : "Decline this reschedule request"}
            </DialogTitle>
            <DialogDescription>
              {mode === "approve"
                ? "Choose a suggestion or set your own time. The original becomes cancelled and a replacement is booked."
                : "The original lesson stays scheduled. You can include a short note to explain your decision."}
            </DialogDescription>
          </DialogHeader>
          {(studentName || originalTime || reason) && (
            <section className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
              {studentName && <h3 className="font-semibold">{studentName}</h3>}
              {originalTime && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Original class
                  </p>
                  <p className="mt-1 font-medium">
                    {fmtDateTime(originalTime)}
                  </p>
                </div>
              )}
              {reason && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Reason for the request
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {reason}
                  </p>
                </div>
              )}
            </section>
          )}
          {mode === "approve" && (
            <section className="form-section">
              <p className="form-section-title mb-4">Requested times · MYT</p>
              <div className="space-y-3">
                {preferredTimes.map((time, index) => (
                  <button
                    key={time}
                    type="button"
                    aria-pressed={selectedTime === time}
                    disabled={isPending}
                    onClick={() => setSelectedTime(time)}
                    className={`flex min-h-20 w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${selectedTime === time ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"}`}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full ${selectedTime === time ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {selectedTime === time ? (
                        <Check size={22} />
                      ) : (
                        <CalendarClock size={22} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-muted-foreground">
                        {index === 0 ? "First choice" : `Alternative ${index}`}
                      </span>
                      <span className="mt-1 block font-semibold">
                        {fmtDateTime(time)}
                      </span>
                    </span>
                    <ArrowRight size={20} className="shrink-0 text-primary" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={isPending}
                aria-pressed={selectedTime === "__custom"}
                onClick={() => setSelectedTime("__custom")}
                className={`mt-3 flex min-h-16 w-full items-center gap-3 rounded-xl border p-4 text-left font-semibold ${selectedTime === "__custom" ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"}`}
              >
                <CalendarClock size={22} /> Choose another date and time
              </button>
              {selectedTime === "__custom" && (
                <div ref={customTimeRef} className="mt-4">
                  <DateTimeField
                    name="approved_custom_time"
                    label="New lesson date"
                    defaultValue={fmtDateInput(
                      preferredTimes[0] ||
                        new Date(Date.now() + 86400000).toISOString(),
                    )}
                    required
                    disabled={isPending}
                  />
                </div>
              )}
            </section>
          )}
          <section className="form-section">
            <Label htmlFor={`request-note-${requestId}`}>
              {mode === "approve" ? "Note to student" : "Reason for declining"}{" "}
              <span className="font-normal text-muted-foreground">
                · optional
              </span>
            </Label>
            <Textarea
              id={`request-note-${requestId}`}
              placeholder="What would you like the student to know?"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isPending}
              rows={3}
              className="mt-3 resize-none"
            />
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMode("idle");
                setError(null);
              }}
              disabled={isPending}
            >
              Back
            </Button>
            {mode === "approve" ? (
              <Button
                onClick={handleApprove}
                disabled={isPending || !selectedTime}
              >
                <Check size={18} />
                {isPending ? "Approving…" : "Approve new time"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isPending}
              >
                {isPending ? "Declining…" : "Decline request"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
