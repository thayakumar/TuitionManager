"use client";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (searchParams.get("report") === "true") {
      setSaved(false);
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
      setSaved(true);
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
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star size={18} className="text-amber-500" />
            Post-Class Report
          </DialogTitle>
          <DialogDescription>
            How was the session with {studentName}?
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 mb-3">
              <Star size={24} className="text-emerald-600" />
            </div>
            <p className="font-semibold text-foreground">Report saved!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Class marked as completed.
            </p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen size={13} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Content
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="topics_covered" className="text-xs">
                    Topics covered
                  </Label>
                  <textarea
                    id="topics_covered"
                    name="topics_covered"
                    defaultValue={initialReport?.topics_covered ?? ""}
                    rows={2}
                    placeholder="What was taught this class"
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="homework" className="text-xs">
                    Homework assigned
                  </Label>
                  <textarea
                    id="homework"
                    name="homework"
                    defaultValue={initialReport?.homework ?? ""}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Brain size={13} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Performance
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="strengths" className="text-xs">
                    Strengths
                  </Label>
                  <textarea
                    id="strengths"
                    name="strengths"
                    defaultValue={initialReport?.strengths ?? ""}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="areas_to_improve" className="text-xs">
                    Areas to improve
                  </Label>
                  <textarea
                    id="areas_to_improve"
                    name="areas_to_improve"
                    defaultValue={initialReport?.areas_to_improve ?? ""}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="performance" className="text-xs">
                  Overall performance
                </Label>
                <textarea
                  id="performance"
                  name="performance"
                  defaultValue={initialReport?.performance ?? ""}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={13} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Next Steps
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="next_focus" className="text-xs">
                    Focus for next class
                  </Label>
                  <textarea
                    id="next_focus"
                    name="next_focus"
                    defaultValue={initialReport?.next_focus ?? ""}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rating" className="text-xs">
                    Rating
                  </Label>
                  <select
                    id="rating"
                    name="rating"
                    defaultValue={initialReport?.rating ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">—</option>
                    <option value="1">1 · Struggled</option>
                    <option value="2">2 · Below average</option>
                    <option value="3">3 · Average</option>
                    <option value="4">4 · Good</option>
                    <option value="5">5 · Excellent</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isPending}
              >
                Skip
              </Button>
              <Button type="submit" disabled={isPending}>
                <Star size={14} />
                {isPending ? "Saving..." : "Save Report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
