"use client";
import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelClass } from "@/lib/actions";
import { LessonActionForm } from "@/components/lesson-action-form";

export function CancelClassDialog({ classId }: { classId: number }) {
  const [open, setOpen] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Ban size={16} /> Cancel class
      </Button>
    );
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="font-medium">Cancel this class in advance?</div>
      <p className="text-sm text-muted-foreground">
        The original stays in history, is excluded from attendance and is not
        invoiced. Use Absent for a no-show.
      </p>
      <LessonActionForm
        action={cancelClass.bind(null, classId)}
        successPath={`/classes/${classId}`}
      >
        <label className="block text-sm">
          Reason (optional)
          <textarea
            name="cancel_reason"
            rows={2}
            maxLength={2000}
            className="mt-1 w-full rounded-lg border border-input bg-background p-3"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reschedule}
            onChange={(e) => setReschedule(e.target.checked)}
          />{" "}
          Schedule a replacement now
        </label>
        {reschedule && (
          <label className="block text-sm">
            New date and time (MYT)
            <input
              name="reschedule_date"
              required
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-input bg-background p-3"
            />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="destructive">
            {reschedule ? "Cancel and reschedule" : "Confirm cancellation"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Keep class
          </Button>
        </div>
      </LessonActionForm>
    </div>
  );
}
