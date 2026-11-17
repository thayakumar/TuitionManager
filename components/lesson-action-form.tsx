"use client";
import { actionError } from "@/lib/action-errors";
import { useActionBusy } from "@/components/action-busy";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Keeps failed business actions on the form, with input intact and a retryable error. */
export function LessonActionForm({
  action,
  children,
  className,
  successPath,
}: {
  action: (data: FormData) => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
  successPath?: string;
}) {
  const router = useRouter();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  useActionBusy(busy || refreshing);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={className}
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (submitting.current) return;
        submitting.current = true;
        setBusy(true);
        setError(null);
        try {
          const result = await action(data);
          startTransition(() => {
            if (successPath)
              router.push(successPath.replace("{id}", String(result)));
            router.refresh();
          });
        } catch (e) {
          setError(actionError(e, "Unable to save. Please try again."));
        } finally {
          submitting.current = false;
          setBusy(false);
        }
      }}
      aria-busy={busy || refreshing}
    >
      <fieldset
        disabled={busy || refreshing}
        className="min-w-0 space-y-4 border-0 p-0"
      >
        {children}
      </fieldset>
      {(busy || refreshing) && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Saving changes…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  );
}
