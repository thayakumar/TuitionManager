"use client";
import Link from "next/link";
import { useActionBusy } from "@/components/action-busy";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markNotificationRead } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
export function NotificationReadLink({
  id,
  href,
  children,
}: {
  id: number;
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [opening, startOpening] = useTransition();
  useActionBusy(busy || opening, "Opening notification…");
  return (
    <span className="min-w-0">
      <Link
        href={href}
        data-busy-ignore
        aria-busy={busy || opening}
        aria-disabled={busy || opening}
        className="font-inherit text-inherit underline-offset-4 hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        onClick={async (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          if (busy || opening) return;
          setBusy(true);
          setError(null);
          try {
            await markNotificationRead(id);
            window.dispatchEvent(new Event("notifications-changed"));
            startOpening(() => {
              router.push(href);
              router.refresh();
            });
          } catch (reason) {
            setError(actionError(reason, "Could not open notification."));
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
        {(busy || opening) && (
          <span className="ml-2 text-sm text-muted-foreground">Opening…</span>
        )}
      </Link>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
