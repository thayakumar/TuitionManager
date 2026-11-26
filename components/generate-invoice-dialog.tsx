"use client";
import { isValidElement, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { generateInvoiceResult } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
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
  async function generate(form: FormData) {
    if (busy) return;
    if (String(form.get("period_start")) > String(form.get("period_end"))) {
      setError("Period end must be on or after period start.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await generateInvoiceResult(form);
      if (!result.success) {
        setError(result.error || "Could not generate invoice.");
        return;
      }
      toast.success("Invoice generated");
      setOpen(false);
      router.push(`/invoices/${result.id}`);
      router.refresh();
    } catch (reason) {
      setError(actionError(reason, "Could not generate invoice."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          if (value) setError(null);
        }
      }}
    >
      {isValidElement(trigger) ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button />}>
          <Receipt size={18} aria-hidden="true" />
          Generate invoice
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Generate invoice</DialogTitle>
            <DialogDescription>
              Choose a student and billing period. We’ll gather the eligible
              lessons for you.
            </DialogDescription>
          </DialogHeader>
          {!students.length ? (
            <div className="form-section text-center">
              <Receipt className="mx-auto mb-4 size-10 text-primary" />
              <h3 className="text-xl font-semibold">Start with a student</h3>
              <p className="mt-2 text-muted-foreground">
                Add an active student before creating an invoice.
              </p>
            </div>
          ) : (
            <form onSubmit={(event) => {
              event.preventDefault();
              void generate(new FormData(event.currentTarget));
            }} className="space-y-6" aria-busy={busy}>
              <fieldset
                disabled={busy}
                className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_240px]"
              >
                <div className="min-w-0 space-y-6">
                  <section className="form-section">
                    <h3 className="form-section-title">Who are we billing?</h3>
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="gi-student">Student</Label>
                      <select
                        id="gi-student"
                        name="student_id"
                        required
                        defaultValue={defaultStudentId ?? students[0].id}
                        className="min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base"
                      >
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </section>
                  <section className="form-section">
                    <h3 className="form-section-title flex items-center gap-2">
                      <CalendarDays size={20} /> Billing period
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Dates are inclusive and use Malaysia time.
                    </p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Period start"
                        name="period_start"
                        type="date"
                        defaultValue={start}
                        required
                      />
                      <Field
                        label="Period end"
                        name="period_end"
                        type="date"
                        defaultValue={end}
                        required
                      />
                    </div>
                  </section>
                  <section className="form-section">
                    <TextAreaField
                      label="Notes (optional)"
                      name="notes"
                      rows={3}
                      placeholder="Add a note to this invoice…"
                    />
                  </section>
                </div>
                <aside className="rounded-2xl border border-primary/20 bg-secondary/50 p-5 self-start">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-card text-primary">
                    <Receipt size={23} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    A clear month-end bill
                  </h3>
                  <ul className="mt-5 space-y-4 text-sm leading-relaxed">
                    <li className="flex gap-2">
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      Only completed, attended lessons that haven’t been billed.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      Rescheduled lessons are included once marked Present.
                    </li>
                    <li className="flex gap-2">
                      <Info
                        size={18}
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      Absent and cancelled lessons are excluded. Trials remain
                      free.
                    </li>
                  </ul>
                  <p className="mt-5 border-t border-primary/15 pt-4 text-sm text-muted-foreground">
                    You’ll see the complete invoice next.
                  </p>
                </aside>
              </fieldset>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-base text-destructive"
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
                  {busy ? (
                    "Generating…"
                  ) : (
                    <>
                      Generate invoice <ArrowRight size={18} aria-hidden="true" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
    </Dialog>
  );
}
