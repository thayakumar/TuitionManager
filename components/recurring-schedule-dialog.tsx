"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createRecurrenceQuick } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { fmtISODate } from "@/lib/format";
import {
  DateField,
  TimeField,
  DurationField,
} from "@/components/scheduling-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type StudentOption = { id: number; name: string };
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function RecurringScheduleFields({
  students,
  defaultStudentId,
  disabled = false,
}: {
  students: StudentOption[];
  defaultStudentId?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const [frequency, setFrequency] = useState("weekly");
  const [days, setDays] = useState<number[]>([]);
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-6 border-0 p-0">
      <section className="form-section">
        <div className="mb-5">
          <p className="form-section-title">01 · The student</p>
          <h3 className="mt-1 text-lg font-semibold">
            Who are these lessons for?
          </h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-student`}>Student</Label>
          <select
            id={`${id}-student`}
            name="student_id"
            required
            defaultValue={defaultStudentId || students[0]?.id || ""}
            className="min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base"
          >
            <option value="" disabled>
              Select a student
            </option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
      </section>
      <section className="form-section">
        <div className="mb-5">
          <p className="form-section-title">02 · The weekly rhythm</p>
          <h3 className="mt-1 text-lg font-semibold">
            Choose days, time and length
          </h3>
        </div>
        <fieldset className="mb-6">
          <legend className="mb-3 font-medium">Lesson days</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAYS.map((day, index) => (
              <label
                key={day}
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 transition-colors ${days.includes(index) ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:bg-secondary"}`}
              >
                <input
                  type="checkbox"
                  name="day_of_week"
                  value={index}
                  checked={days.includes(index)}
                  onChange={(event) =>
                    setDays(
                      event.target.checked
                        ? [...days, index]
                        : days.filter((dayIndex) => dayIndex !== index),
                    )
                  }
                  className="size-4 accent-primary"
                />
                <span className="text-sm font-medium">{day}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Select one or more days. Every chosen day uses the same lesson time.
          </p>
        </fieldset>
        <div className="space-y-6">
          <TimeField
            name="time"
            label="Lesson time · MYT"
            defaultValue="16:00"
            required
          />
          <DurationField defaultValue={60} />
        </div>
      </section>
      <section className="form-section">
        <div className="mb-5">
          <p className="form-section-title">03 · Repeat and finish</p>
          <h3 className="mt-1 text-lg font-semibold">
            Set the series boundaries
          </h3>
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`${id}-frequency`}>Repeat</Label>
            <select
              id={`${id}-frequency`}
              name="frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base"
            >
              <option value="weekly">Every week</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="custom">Custom interval</option>
            </select>
          </div>
          {frequency === "custom" && (
            <div className="space-y-2">
              <Label htmlFor={`${id}-interval`}>Days between lessons</Label>
              <input
                id={`${id}-interval`}
                type="number"
                name="custom_interval_days"
                required
                min={1}
                max={366}
                defaultValue={7}
                className="min-h-12 w-full rounded-xl border border-input bg-card px-4"
              />
              <p className="text-sm text-muted-foreground">
                Each selected day starts its own repeating series at this
                interval.
              </p>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <DateField
              name="start_date"
              label="First date"
              required
              defaultValue={fmtISODate(new Date().toISOString())}
            />
            <DateField name="end_date" label="Last date · optional" />
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-sm leading-relaxed">
            <CalendarRange size={22} className="mt-0.5 shrink-0 text-primary" />
            <p>
              Leave the last date empty to schedule through{" "}
              <strong>31 December of the first date’s year</strong>. Earlier end
              dates are supported. Overlapping lessons are blocked before
              saving.
            </p>
          </div>
        </div>
      </section>
    </fieldset>
  );
}

export function RecurringScheduleDialog({
  students,
  defaultStudentId,
  trigger,
}: {
  students: StudentOption[];
  defaultStudentId?: number;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(data: FormData) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await createRecurrenceQuick(data);
      toast.success("Recurring lessons scheduled through the selected year");
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(
        actionError(
          reason,
          "Unable to create the series. Your choices are still here; please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="secondary" />}>
          <Repeat size={18} />
          Recurring
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Build a lesson rhythm</DialogTitle>
          <DialogDescription>
            One pattern, a whole year of learning. All lesson times are in
            Malaysia time.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-6" aria-busy={pending}>
          <RecurringScheduleFields
            students={students}
            defaultStudentId={defaultStudentId}
            disabled={pending}
          />
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !students.length}>
              <Sparkles size={18} />
              {pending ? "Creating series…" : "Create lesson series"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
