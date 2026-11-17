"use client";

import { Button } from "@/components/ui/button";
import { actionError } from "@/lib/action-errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      data-page-error="true"
      role="alert"
      className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <div
        className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-2xl text-primary"
        aria-hidden="true"
      >
        ↻
      </div>
      <h2 className="text-xl font-semibold">
        We couldn’t complete that request
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {actionError(
          error,
          "Please try again. If you were editing something, check its current state before submitting it again.",
        )}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </section>
  );
}
