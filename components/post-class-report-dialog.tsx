"use client";
import { getInitials } from "@/lib/initials";
import { actionError } from "@/lib/action-errors";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Star, BookOpen, Brain, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextAreaField, SelectField } from "@/components/form-field";
import { toast } from "sonner";
import { saveReportQuick } from "@/lib/actions";
import type { Report } from "@/lib/types";

export function PostClassReportDialog({
  classId,
  studentName,
  initialReport,
}: {
  classId: number;
  studentName: string;
  initialReport?: Report | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("report") === "true") {
      setError(null);
      setOpen(true);
    }
  }, [searchParams]);

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("report");
    router.replace(url.pathname);
  }

  async function handleSubmit(formData: FormData) {
    if (isPending) return;
    setPending(true);
    setError(null);
    try {
      await saveReportQuick(classId, formData);
      toast.success("Report saved");
      setOpen(false);
      router.replace(window.location.pathname);
      router.refresh();
    } catch (e) {
      setError(
        actionError(e, "Unable to save this report. Your text has been kept."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BookOpen size={24} className="text-primary" /> Lesson report
          </DialogTitle>
          <DialogDescription>
            A useful recap for {studentName} and their parent: what clicked,
            what to practise and what comes next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(new FormData(event.currentTarget));
            }} className="space-y-6" aria-busy={isPending}>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary px-5 py-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-card font-semibold text-primary">
              {getInitials(studentName)}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{studentName}</p>
              <p className="text-sm text-muted-foreground">
                {initialReport
                  ? "Update the existing class recap"
                  : "Create a recap for this lesson"}{" "}
                · Shown in parent reports
              </p>
            </div>
          </div>
          <fieldset
            disabled={isPending}
            className="min-w-0 space-y-5 border-0 p-0"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <section className="form-section space-y-4">
                <div>
                  <h2 className="form-section-title flex items-center gap-2">
                    <BookOpen size={20} /> What we covered
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Give the family a clear lesson summary.
                  </p>
                </div>
                <TextAreaField
                  label="Topics covered"
                  name="topics_covered"
                  defaultValue={initialReport?.topics_covered ?? ""}
                  rows={3}
                  placeholder="Key ideas, skills and activities from this lesson"
                />
                <TextAreaField
                  label="Homework assigned"
                  name="homework"
                  defaultValue={initialReport?.homework ?? ""}
                  rows={3}
                  placeholder="Practice to complete before the next lesson"
                />
              </section>
              <section className="form-section space-y-4">
                <div>
                  <h2 className="form-section-title flex items-center gap-2">
                    <Brain size={20} /> How it went
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Celebrate progress and make support specific.
                  </p>
                </div>
                <TextAreaField
                  label="Strengths"
                  name="strengths"
                  defaultValue={initialReport?.strengths ?? ""}
                  rows={3}
                  placeholder="What did the student do well?"
                />
                <TextAreaField
                  label="Areas to improve"
                  name="areas_to_improve"
                  defaultValue={initialReport?.areas_to_improve ?? ""}
                  rows={3}
                  placeholder="What needs more practice or confidence?"
                />
              </section>
            </div>
            <section className="form-section space-y-4">
              <div>
                <h2 className="form-section-title flex items-center gap-2">
                  <Target size={20} /> The next step
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bring the lesson together with a clear direction.
                </p>
              </div>
              <TextAreaField
                label="Overall performance"
                name="performance"
                defaultValue={initialReport?.performance ?? ""}
                rows={2}
                placeholder="Your overall observation of this lesson"
              />
              <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <TextAreaField
                  label="Focus for next class"
                  name="next_focus"
                  defaultValue={initialReport?.next_focus ?? ""}
                  rows={2}
                  placeholder="The most useful thing to work on next"
                />
                <SelectField
                  label="Lesson rating"
                  name="rating"
                  defaultValue={
                    initialReport?.rating ? String(initialReport.rating) : ""
                  }
                  options={[
                    { value: "", label: "Not rated" },
                    { value: "1", label: "1 · Struggled" },
                    { value: "2", label: "2 · Below average" },
                    { value: "3", label: "3 · Average" },
                    { value: "4", label: "4 · Good" },
                    { value: "5", label: "5 · Excellent" },
                  ]}
                />
              </div>
            </section>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              <Star size={18} />
              {isPending
                ? "Saving…"
                : initialReport
                  ? "Save changes"
                  : "Save Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
