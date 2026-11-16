"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markNotificationRead } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { Button } from "@/components/ui/button";
export function NotificationReadLink({
  id,
  href,
}: {
  id: number;
  href: string;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await markNotificationRead(id);
            window.dispatchEvent(new Event("notifications-changed"));
            router.push(href);
            router.refresh();
          } catch (e) {
            setError(actionError(e, "Could not open notification."));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : "View"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
