"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveRescheduleRequest,
  rejectRescheduleRequest,
} from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { actionError } from "@/lib/action-errors";
import { fmtDateTime } from "@/lib/format";

export function RescheduleActions({
  requestId,
  preferredTimes,
}: {
  requestId: number;
  preferredTimes: string[];
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [selectedTime, setSelectedTime] = useState(preferredTimes[0]);
  const [note, setNote] = useState("");
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function resolve(approved: boolean) {
    if (isPending) return;
    setPending(true);
    setError(null);
    try {
      const result = approved
        ? await approveRescheduleRequest(requestId, selectedTime, note || null)
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
      router.refresh();
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

  if (mode === "idle") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => setMode("approve")}
          disabled={isPending}
        >
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
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/20">
      {mode === "approve" && (
        <div>
          <p className="text-sm font-medium mb-2">
            Select a time to reschedule to:
          </p>
          <div className="flex flex-wrap gap-2">
            {preferredTimes.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedTime(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  selectedTime === t
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border/50 hover:bg-muted/50"
                }`}
              >
                {fmtDateTime(t)}
              </button>
            ))}
          </div>
        </div>
      )}
      <Textarea
        placeholder={
          mode === "approve"
            ? "Note to student (optional)"
            : "Reason for rejection (optional)"
        }
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="resize-none"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {mode === "approve" ? (
          <Button size="sm" onClick={handleApprove} disabled={isPending}>
            {isPending ? "Approving..." : "Confirm Approval"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={isPending}
          >
            {isPending ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setMode("idle")}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
