"use client";
import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelClass } from "@/lib/actions";

export function CancelClassDialog({ classId }: { classId: number }) {
  const [open, setOpen] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  const action = cancelClass.bind(null, classId);

  if (!open) {
    return (
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Ban size={16} /> Cancel class
      </Button>
    );
  }

  return (
    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5 space-y-3">
      <div className="text-sm font-medium text-foreground">Cancel this class?</div>
      <form action={action}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Reason (optional)</label>
            <textarea
              name="cancel_reason"
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Why is this class being cancelled?"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reschedule}
              onChange={(e) => setReschedule(e.target.checked)}
            />
            Reschedule to a new date
          </label>
          {reschedule && (
            <div>
              <label className="text-xs text-muted-foreground">New date & time</label>
              <input
                type="datetime-local"
                name="reschedule_date"
                required={reschedule}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive">
              {reschedule ? "Cancel & reschedule" : "Cancel class"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Never mind
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
