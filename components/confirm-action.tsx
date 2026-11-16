"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { actionError } from "@/lib/action-errors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function ConfirmAction({
  action,
  label,
  message,
}: {
  action: () => Promise<void>;
  label: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      setOpen(false);
    } catch (reason) {
      setError(actionError(reason, "The change could not be saved."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}?</DialogTitle>
            <DialogDescription>
              Review this change before continuing.
            </DialogDescription>
          </DialogHeader>
          <div className="form-section flex items-start gap-4">
            <AlertTriangle
              className="mt-1 shrink-0 text-destructive"
              size={24}
            />
            <p className="leading-relaxed">{message}</p>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-destructive"
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
              Go back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={confirm}
            >
              {busy ? "Saving…" : label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
