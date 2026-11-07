"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { createClassQuick } from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type StudentOption = { id: number; name: string; subject: string | null };

export function ScheduleClassDialog({
  students,
  defaultStudentId,
  trigger,
}: {
  students: StudentOption[];
  defaultStudentId?: number;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultTime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createClassQuick(formData);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <Button>
            <CalendarPlus size={16} /> Schedule class
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus size={18} className="text-primary" />
              Schedule Class
            </DialogTitle>
            <DialogDescription>
              Schedule a new class session
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sc-student">Student *</Label>
                <select
                  id="sc-student"
                  name="student_id"
                  required
                  defaultValue={defaultStudentId || students[0]?.id}
                  className={selectClass}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-datetime">Date & time *</Label>
                <input
                  id="sc-datetime"
                  name="scheduled_at"
                  type="datetime-local"
                  required
                  defaultValue={defaultTime}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sc-duration">Duration (min)</Label>
                  <input
                    id="sc-duration"
                    name="duration_minutes"
                    type="number"
                    defaultValue={60}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-subject">Subject</Label>
                  <input
                    id="sc-subject"
                    name="subject"
                    placeholder="e.g. Algebra"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-location">Location</Label>
                <input
                  id="sc-location"
                  name="location"
                  placeholder="e.g. Zoom / Home"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  name="is_trial"
                  className="size-4 rounded border-input accent-primary"
                />
                Trial class (invoiced at RM 0.00)
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
