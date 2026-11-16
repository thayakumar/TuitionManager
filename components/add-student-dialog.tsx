"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { actionError } from "@/lib/action-errors";
import { createStudentQuick } from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/form-field";

export function AddStudentDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      const id = await createStudentQuick(formData);
      toast.success("Student added");
      setOpen(false);
      router.refresh();
      router.push(`/students/${id}`);
    } catch (e) {
      setError(actionError(e, "Could not save this student."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <Button>
            <Plus size={16} /> Add student
          </Button>
        )}
      </span>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!isPending) setOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} className="text-primary" />
              Add a student
            </DialogTitle>
            <DialogDescription>
              Create their profile, set a lesson rate and keep useful contacts
              together.
            </DialogDescription>
          </DialogHeader>

          <form
            action={handleSubmit}
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
                  <div className="sm:col-span-2">
                    <Field
                      label="Full name"
                      name="name"
                      required
                      placeholder="Student’s full name"
                    />
                  </div>
                  <Field
                    label="Grade / level"
                    name="grade_level"
                    placeholder="e.g. Form 4"
                  />
                  <Field
                    label="Hourly rate"
                    name="hourly_rate"
                    defaultValue={0}
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
                    Student & guardian contacts
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Optional details to keep the right people in touch.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Student phone"
                    name="phone"
                    type="tel"
                    placeholder="Phone number"
                  />
                  <Field
                    label="Student email"
                    name="email"
                    type="email"
                    placeholder="Email address"
                  />
                  <Field
                    label="Guardian name"
                    name="guardian_name"
                    placeholder="Parent or guardian"
                  />
                  <Field
                    label="Guardian contact"
                    name="guardian_contact"
                    placeholder="Phone or email"
                  />
                </div>
              </section>
              <details className="form-section">
                <summary className="cursor-pointer font-semibold">
                  Additional details{" "}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    Optional
                  </span>
                </summary>
                <div className="mt-5 space-y-4">
                  <Field
                    label="Subject"
                    name="subject"
                    placeholder="e.g. Mathematics"
                  />
                  <TextAreaField
                    label="Private teaching notes"
                    name="notes"
                    rows={3}
                    placeholder="Learning goals, preferences or useful context"
                  />
                </div>
              </details>
              <div className="rounded-2xl border border-primary/15 bg-secondary px-5 py-4">
                <p className="font-semibold">
                  Their learning space is ready next
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Login details are generated from their first name. If that
                  username is taken, a number is added. You can copy the exact
                  credentials from the student profile after saving.
                </p>
              </div>
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
                {isPending ? "Creating..." : "Create Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
