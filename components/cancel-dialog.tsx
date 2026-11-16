"use client";

import { useState } from "react";
import { Ban, CalendarClock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { DateTimeField } from "@/components/scheduling-fields";
import { cancelClass } from "@/lib/actions";
import { LessonActionForm } from "@/components/lesson-action-form";
import { fmtDateInput } from "@/lib/format";

export function CancelClassDialog({ classId }: { classId: number }) {
  const [open, setOpen] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) setOpen(value);
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <Ban size={18} />
        Cancel class
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change the plan, keep the history</DialogTitle>
          <DialogDescription>
            Cancel an advance-notice booking, with an optional replacement
            lesson.
          </DialogDescription>
        </DialogHeader>
        <LessonActionForm
          action={async (data) => {
            setPending(true);
            try {
              await cancelClass(classId, data);
              setOpen(false);
            } finally {
              setPending(false);
            }
          }}
          successPath={`/classes/${classId}`}
        >
          <section className="form-section">
            <p className="form-section-title">What happens next</p>
            <div className="mt-4 flex items-start gap-3">
              <History size={25} className="shrink-0 text-muted-foreground" />
              <p className="text-base leading-relaxed text-muted-foreground">
                The original stays in history as{" "}
                <strong className="text-foreground">Cancelled</strong>. It is
                excluded from attendance and never appears on an invoice. For a
                last-minute cancellation or no-show, mark the student Absent
                instead.
              </p>
            </div>
          </section>
          <section className="form-section">
            <label className="block space-y-2">
              <span className="font-medium">
                Cancellation reason{" "}
                <span className="font-normal text-muted-foreground">
                  · optional
                </span>
              </span>
              <textarea
                name="cancel_reason"
                rows={3}
                maxLength={1000}
                placeholder="A short note for the lesson record"
                className="w-full rounded-xl border border-input bg-card p-4"
              />
            </label>
          </section>
          <section className="form-section">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={reschedule}
                onChange={(event) => setReschedule(event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  <CalendarClock size={21} />
                  Schedule a replacement
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Keep the same student, duration and trial status.
                </span>
              </span>
            </label>
            {reschedule && (
              <div className="mt-5 border-t border-border pt-5">
                <DateTimeField
                  name="reschedule_date"
                  label="Replacement date and time · MYT"
                  required
                  defaultValue={fmtDateInput(
                    new Date(Date.now() + 86400000).toISOString(),
                  )}
                />
              </div>
            )}
          </section>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Keep class
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending
                ? "Saving change…"
                : reschedule
                  ? "Cancel and reschedule"
                  : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </LessonActionForm>
      </DialogContent>
    </Dialog>
  );
}
