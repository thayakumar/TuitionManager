"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveRescheduleRequest, rejectRescheduleRequest } from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveRescheduleRequest(requestId, selectedTime, note || null);
      if (result?.success) {
        toast.success("Request approved — class rescheduled");
        router.refresh();
      } else {
        toast.error(result?.error || "Failed to approve");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectRescheduleRequest(requestId, note || null);
      if (result?.success) {
        toast.success("Request rejected");
        router.refresh();
      } else {
        toast.error(result?.error || "Failed to reject");
      }
    });
  }

  if (mode === "idle") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setMode("approve")} disabled={isPending}>
          <Check size={14} /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMode("reject")} disabled={isPending}>
          <X size={14} /> Reject
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/20">
      {mode === "approve" && (
        <div>
          <p className="text-sm font-medium mb-2">Select a time to reschedule to:</p>
          <div className="flex flex-wrap gap-2">
            {preferredTimes.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedTime(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  selectedTime === t
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
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
        placeholder={mode === "approve" ? "Note to student (optional)" : "Reason for rejection (optional)"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="resize-none"
      />
      <div className="flex gap-2">
        {mode === "approve" ? (
          <Button size="sm" onClick={handleApprove} disabled={isPending}>
            {isPending ? "Approving..." : "Confirm Approval"}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={handleReject} disabled={isPending}>
            {isPending ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setMode("idle")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
