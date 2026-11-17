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
  DialogFooter,
} from "@/components/ui/dialog";
import { DateTimeField } from "@/components/scheduling-fields";
import {
  createRescheduleRequest,
  createParentRescheduleRequest,
} from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RescheduleRequestDialog({
  classId,
  studentId,
  parentToken,
}: {
  classId: number;
  studentId: number;
  parentToken?: string;
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
      const result = parentToken
        ? await createParentRescheduleRequest(parentToken, data)
        : await createRescheduleRequest(data);
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Request a new lesson time</DialogTitle>
          <DialogDescription>
            Suggest up to three times in Malaysia time. Your current booking
            stays in place until your tutor approves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6" aria-busy={saving}>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-base leading-relaxed text-blue-900">
            Your current lesson remains booked. Your tutor will choose a
            suggested time or confirm another available slot.
          </div>
          {[1, 2, 3].map((index) => (
            <section key={index} className="form-section">
              <p className="form-section-title mb-4">
                {index === 1
                  ? "First choice"
                  : `Alternative ${index - 1} · optional`}
              </p>
              <DateTimeField
                name={`preferred_time_${index}`}
                label={`Preferred time ${index}`}
                required={index === 1}
                disabled={saving}
              />
            </section>
          ))}
          <section className="form-section">
            <label htmlFor={`${prefix}-reason`} className="text-sm font-medium">
              Reason (optional)
            </label>
            <Textarea
              id={`${prefix}-reason`}
              name="reason"
              placeholder="What would you like your tutor to know?"
              rows={2}
              disabled={saving}
              className="mt-3 resize-none"
            />
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
