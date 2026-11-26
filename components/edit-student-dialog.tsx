"use client";

import { isValidElement, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { actionError } from "@/lib/action-errors";
import { updateStudentQuick } from "@/lib/actions";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/form-field";
import type { Student } from "@/lib/types";

export function EditStudentDialog({
  student,
  trigger,
}: {
  student: Student;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boundAction = updateStudentQuick.bind(null, student.id);

  async function handleSubmit(formData: FormData) {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      await boundAction(formData);
      toast.success("Student updated");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Could not save this student."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) {
          setOpen(v);
          if (v) setError(null);
        }
      }}
    >
      {isValidElement(trigger) ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="secondary" />}>
          <Pencil size={16} aria-hidden="true" /> Edit
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={18} className="text-primary" aria-hidden="true" />
            Edit student profile
          </DialogTitle>
          <DialogDescription>
            Update {student.name}&apos;s information
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit(new FormData(event.currentTarget));
          }}
          className="space-y-6"
          aria-busy={isPending}
        >
          <fieldset
            disabled={isPending}
            className="min-w-0 space-y-6 border-0 p-0"
          >
            <section className="form-section">
              <div className="mb-5">
                <p className="form-section-title">Learning profile</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The essentials for lessons and monthly tuition.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  name="name"
                  defaultValue={student.name ?? ""}
                  required
                  placeholder="Student’s full name"
                />
                <Field
                  label="Subject"
                  name="subject"
                  defaultValue={student.subject ?? ""}
                  placeholder="e.g. Mathematics"
                />
                <Field
                  label="Grade / level"
                  name="grade_level"
                  defaultValue={student.grade_level ?? ""}
                  placeholder="e.g. Form 4"
                />
                <Field
                  label="Hourly rate"
                  name="hourly_rate"
                  defaultValue={Number(student.hourly_rate)}
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000000"
                />
              </div>
            </section>
            <section className="form-section">
              <div className="mb-5">
                <p className="form-section-title">
                  Student &amp; guardian contacts
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Optional details to keep the right people in touch.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Student phone"
                  name="phone"
                  defaultValue={student.phone ?? ""}
                  type="tel"
                  placeholder="Phone number"
                />
                <Field
                  label="Student email"
                  name="email"
                  defaultValue={student.email ?? ""}
                  type="email"
                  placeholder="Email address"
                />
                <Field
                  label="Guardian name"
                  name="guardian_name"
                  defaultValue={student.guardian_name ?? ""}
                  placeholder="Parent or guardian"
                />
                <Field
                  label="Guardian contact"
                  name="guardian_contact"
                  defaultValue={student.guardian_contact ?? ""}
                  placeholder="Phone or email"
                />
              </div>
            </section>
            <details className="form-section" open>
              <summary className="cursor-pointer font-semibold">
                Additional notes{" "}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  Optional
                </span>
              </summary>
              <div className="mt-5 space-y-4">
                <TextAreaField
                  label="Private teaching notes"
                  name="notes"
                  rows={3}
                  placeholder="Learning goals, preferences or useful context"
                  defaultValue={student.notes ?? ""}
                />
              </div>
            </details>
            <section className="form-section flex items-start gap-4">
              <input
                id="edit-active"
                type="checkbox"
                name="active"
                defaultChecked={!!student.active}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <label htmlFor="edit-active" className="cursor-pointer">
                <span className="block font-semibold">
                  Student access enabled
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  Switch off to revoke portal access immediately. Lesson,
                  invoice and submission history is kept.
                </span>
              </label>
            </section>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
