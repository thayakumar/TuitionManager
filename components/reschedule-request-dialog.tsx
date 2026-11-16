"use client";

import { useId, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createRescheduleRequest } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RescheduleRequestDialog({
  classId,
  studentId,
}: {
  classId: number;
  studentId: number;
}) {
  const prefix = useId();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    data.set("class_id", String(classId));
    data.set("student_id", String(studentId));
    setSaving(true);
    setError(null);
    try {
      const result = await createRescheduleRequest(data);
      if (!result?.success) {
        setError(result?.error || "The request could not be sent.");
        return;
      }
      toast.success(
        "Request sent. Your original lesson stays scheduled until your tutor approves a new time.",
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(
        actionError(error, "The request could not be sent. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClock size={14} /> Request Reschedule
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a new lesson time</DialogTitle>
          <DialogDescription>
            Suggest up to three times in Malaysia time. Your current booking
            stays in place until your tutor approves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={saving}>
          {[1, 2, 3].map((index) => (
            <div key={index}>
              <label
                htmlFor={`${prefix}-${index}`}
                className="text-sm font-medium"
              >
                Preferred time {index} {index === 1 ? "*" : "(optional)"}
              </label>
              <input
                id={`${prefix}-${index}`}
                type="datetime-local"
                name={`preferred_time_${index}`}
                required={index === 1}
                disabled={saving}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div>
            <label htmlFor={`${prefix}-reason`} className="text-sm font-medium">
              Reason (optional)
            </label>
            <Textarea
              id={`${prefix}-reason`}
              name="reason"
              placeholder="What would you like your tutor to know?"
              rows={2}
              disabled={saving}
              className="mt-1 resize-none"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Sending request…" : "Send request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
