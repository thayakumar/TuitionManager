"use client";
import { useState } from "react";
import { actionError } from "@/lib/action-errors";
import { Button } from "@/components/ui/button";
export function ConfirmAction({
  action,
  label,
  message,
}: {
  action: () => Promise<void>;
  label: string;
  message: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="destructive"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(message)) return;
          setBusy(true);
          setError(null);
          try {
            await action();
          } catch (e) {
            setError(actionError(e, "The change could not be saved."));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
