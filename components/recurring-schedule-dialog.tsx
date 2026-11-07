"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { createRecurrenceQuick } from "@/lib/actions";
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type StudentOption = { id: number; name: string };

export function RecurringScheduleDialog({
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

  const defaultStart = new Date().toISOString().split("T")[0];

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createRecurrenceQuick(formData);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <Button variant="secondary">
            <Repeat size={16} /> Recurring
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat size={18} className="text-primary" />
              Recurring Schedule
            </DialogTitle>
            <DialogDescription>
              Auto-generates classes on selected days
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-student">Student *</Label>
                <select
                  id="rc-student"
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
                <Label className="text-sm">Days of week *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS.map((day, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        name="day_of_week"
                        value={String(i)}
                        className="size-4 rounded border-input accent-primary"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rc-time">Time *</Label>
                <input
                  id="rc-time"
                  name="time"
                  type="time"
                  required
                  defaultValue="16:00"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rc-duration">Duration (min)</Label>
                  <input
                    id="rc-duration"
                    name="duration_minutes"
                    type="number"
                    defaultValue={60}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-subject">Subject</Label>
                  <input
                    id="rc-subject"
                    name="subject"
                    placeholder="e.g. Mathematics"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rc-location">Location</Label>
                <input
                  id="rc-location"
                  name="location"
                  placeholder="e.g. Zoom / Home"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rc-frequency">Frequency</Label>
                <select
                  id="rc-frequency"
                  name="frequency"
                  defaultValue="weekly"
                  className={selectClass}
                >
                  <option value="weekly">Every week</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="custom">Custom interval</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rc-custom">Custom interval (days)</Label>
                <input
                  id="rc-custom"
                  name="custom_interval_days"
                  type="number"
                  placeholder="e.g. 10"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rc-start">Start date *</Label>
                  <input
                    id="rc-start"
                    name="start_date"
                    type="date"
                    required
                    defaultValue={defaultStart}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-end">End date</Label>
                  <input
                    id="rc-end"
                    name="end_date"
                    type="date"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
