"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { Button } from "@/components/ui/button";

export function NotificationReadAction({ id, recipientType = "student", recipientId = null }: { id?: number; recipientType?: "admin" | "student"; recipientId?: number | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function markRead() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (id === undefined) await markAllNotificationsRead(recipientType, recipientId);
      else await markNotificationRead(id);
      window.dispatchEvent(new Event("notifications-changed"));
      router.refresh();
    } catch (error) {
      setError(actionError(error, "Could not update notifications. Please try again."));
    } finally { setBusy(false); }
  }
  return <div><Button type="button" variant={id === undefined ? "outline" : "ghost"} size="sm" disabled={busy} onClick={markRead}>{busy ? "Updating…" : id === undefined ? "Mark all read" : "Mark read"}</Button>{error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}</div>;
}
