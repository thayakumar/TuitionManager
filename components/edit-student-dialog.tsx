"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateStudentQuick } from "@/lib/actions";
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
import type { Student } from "@/lib/types";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function EditStudentDialog({
  student,
  trigger,
}: {
  student: Student;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const boundAction = updateStudentQuick.bind(null, student.id);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await boundAction(formData);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <Button variant="secondary">
            <Pencil size={16} /> Edit
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} className="text-primary" />
              Edit Student
            </DialogTitle>
            <DialogDescription>
              Update {student.name}&apos;s information
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-name">Full name *</Label>
                <input
                  id="edit-name"
                  name="name"
                  required
                  defaultValue={student.name}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-subject">Subject</Label>
                <input
                  id="edit-subject"
                  name="subject"
                  defaultValue={student.subject ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-grade">Grade / Level</Label>
                <input
                  id="edit-grade"
                  name="grade_level"
                  defaultValue={student.grade_level ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-rate">Hourly rate</Label>
                <input
                  id="edit-rate"
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={Number(student.hourly_rate)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <input
                  id="edit-phone"
                  name="phone"
                  defaultValue={student.phone ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={student.email ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-guardian">Guardian name</Label>
                <input
                  id="edit-guardian"
                  name="guardian_name"
                  defaultValue={student.guardian_name ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-guardian-contact">Guardian contact</Label>
                <input
                  id="edit-guardian-contact"
                  name="guardian_contact"
                  defaultValue={student.guardian_contact ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <textarea
                  id="edit-notes"
                  name="notes"
                  rows={2}
                  defaultValue={student.notes ?? ""}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={!!student.active}
                    className="size-4 rounded border-input accent-primary"
                  />
                  Active
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
