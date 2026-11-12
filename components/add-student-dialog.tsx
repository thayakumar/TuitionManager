"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function AddStudentDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const id = await createStudentQuick(formData);
      toast.success("Student added");
      setOpen(false);
      router.refresh();
      router.push(`/students/${id}`);
    });
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} className="text-primary" />
              Add New Student
            </DialogTitle>
            <DialogDescription>
              Fill in the student details below. Username and password are auto-generated from the first name.
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-name">Full name *</Label>
                <input
                  id="add-name"
                  name="name"
                  required
                  placeholder="Student's full name"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-subject">Subject</Label>
                <input
                  id="add-subject"
                  name="subject"
                  placeholder="e.g. Mathematics"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-grade">Grade / Level</Label>
                <input
                  id="add-grade"
                  name="grade_level"
                  placeholder="e.g. Form 4"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-rate">Hourly rate</Label>
                <input
                  id="add-rate"
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={0}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-phone">Phone</Label>
                <input
                  id="add-phone"
                  name="phone"
                  placeholder="Phone number"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-email">Email</Label>
                <input
                  id="add-email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-guardian">Guardian name</Label>
                <input
                  id="add-guardian"
                  name="guardian_name"
                  placeholder="Parent/guardian"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-guardian-contact">Guardian contact</Label>
                <input
                  id="add-guardian-contact"
                  name="guardian_contact"
                  placeholder="Guardian phone/email"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-notes">Notes</Label>
                <textarea
                  id="add-notes"
                  name="notes"
                  rows={2}
                  placeholder="Learning goals, preferences..."
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Credentials auto-generated: username = <strong>firstname</strong>, password = <strong>firstname123</strong>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
