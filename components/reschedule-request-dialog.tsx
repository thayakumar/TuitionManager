"use client";

import { useState, useTransition } from "react";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RescheduleRequestDialog({
  classId,
  studentId,
}: {
  classId: number;
  studentId: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("class_id", String(classId));
    formData.set("student_id", String(studentId));

    startTransition(async () => {
      const result = await createRescheduleRequest(formData);
      if (result?.success) {
        toast.success("Reschedule request sent to your tutor");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result?.error || "Failed to send request");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm" asChild>
          <span><CalendarClock size={14} /> Request Reschedule</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Reschedule</DialogTitle>
          <DialogDescription>
            Suggest up to 3 preferred times. Your tutor will review and approve.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Preferred time 1 *</label>
            <input
              type="datetime-local"
              name="preferred_time_1"
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Preferred time 2 (optional)</label>
            <input
              type="datetime-local"
              name="preferred_time_2"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Preferred time 3 (optional)</label>
            <input
              type="datetime-local"
              name="preferred_time_3"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Reason (optional)</label>
            <Textarea
              name="reason"
              placeholder="Why do you need to reschedule?"
              rows={2}
              className="mt-1 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
