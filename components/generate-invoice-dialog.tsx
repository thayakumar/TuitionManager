"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { generateInvoiceResult } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
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
function monthRange() {
  const local = new Date(Date.now() + 8 * 3600000),
    year = local.getUTCFullYear(),
    month = local.getUTCMonth();
  return {
    start: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    end: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
  };
}
export function GenerateInvoiceDialog({
  students,
  defaultStudentId,
  trigger,
}: {
  students: { id: number; name: string }[];
  defaultStudentId?: number;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const { start, end } = monthRange();
  return (
    <>
      <span
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex cursor-pointer"
      >
        {trigger ?? (
          <Button>
            <Receipt size={16} />
            Generate invoice
          </Button>
        )}
      </span>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate invoice</DialogTitle>
            <DialogDescription>
              Includes unbilled completed, attended lessons. Absences and
              cancelled lessons are excluded. Rescheduled lessons are included
              once marked Present.
            </DialogDescription>
          </DialogHeader>
          {!students.length ? (
            <p className="text-sm text-muted-foreground">
              Add an active student first.
            </p>
          ) : (
            <form
              className="space-y-4"
              action={async (f) => {
                if (busy) return;
                const from = String(f.get("period_start")),
                  to = String(f.get("period_end"));
                if (from > to) {
                  setError("Period end must be on or after period start.");
                  return;
                }
                setBusy(true);
                setError(null);
                try {
                  const result = await generateInvoiceResult(f);
                  if (!result.success) {
                    setError(result.error || "Could not generate invoice.");
                    return;
                  }
                  toast.success("Invoice generated");
                  setOpen(false);
                  router.push(`/invoices/${result.id}`);
                  router.refresh();
                } catch (e) {
                  setError(actionError(e, "Could not generate invoice."));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="gi-student">Student</Label>
                <select
                  id="gi-student"
                  name="student_id"
                  required
                  defaultValue={defaultStudentId ?? students[0].id}
                  className="min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Period start", "period_start", start],
                  ["Period end", "period_end", end],
                ].map(([label, name, value]) => (
                  <label key={name} className="space-y-2 text-xs font-medium">
                    {label}
                    <input
                      name={name}
                      type="date"
                      required
                      defaultValue={value}
                      className="mt-2 min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
                    />
                  </label>
                ))}
              </div>
              <label className="block text-xs font-medium">
                Notes (optional)
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={20000}
                  className="mt-2 w-full rounded-xl border border-input bg-card p-3 text-sm"
                />
              </label>
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
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Generating…" : "Generate"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
