"use client";
import { ScheduleFields } from "@/components/scheduling-fields";
import { actionError } from "@/lib/action-errors";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDateInput, fmtISODate } from "@/lib/format";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
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
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTime = fmtDateInput(
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );

  async function handleSubmit(formData: FormData) {
    if (isPending) return;
    setPending(true);
    setError(null);
    try {
      await createClassQuick(formData);
      toast.success("Class scheduled");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(
        actionError(e, "Unable to save this schedule. Please try again."),
      );
    } finally {
      setPending(false);
    }
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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!isPending) {
            setOpen(v);
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus size={18} className="text-primary" />
              Plan a lesson
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose a student, date, time and duration.
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-6">
            <fieldset disabled={isPending} className="min-w-0 border-0 p-0">
              <ScheduleFields
                students={students}
                defaultStudentId={defaultStudentId}
                defaultDateTime={defaultTime}
              />
            </fieldset>

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
                variant="outline"
                onClick={() => setOpen(false)}
              >
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
