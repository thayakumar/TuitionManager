"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getNotificationSummary } from "@/lib/actions";
export function UnreadBadge({ count }: { count: number }) {
  return count > 0 ? (
    <span
      aria-label={`${count} unread notifications`}
      className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold leading-none text-primary-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  ) : null;
}
export function useUnreadNotifications(
  recipientType: "admin" | "student",
  recipientId: number | null,
  initial = 0,
) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    let live = true,
      pending = false;
    async function update() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const result = await getNotificationSummary(recipientType, recipientId);
        if (live) setCount(result.unreadCount);
      } catch {
        /* Session guards own access; preserve current count on a temporary request failure. */
      } finally {
        pending = false;
      }
    }
    void update();
    const timer = window.setInterval(() => void update(), 15000);
    const refresh = () => void update();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("notifications-changed", refresh);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("notifications-changed", refresh);
    };
  }, [recipientType, recipientId]);
  return count;
}
export function NotificationBell({
  unreadCount = 0,
  href,
  recipientType = "admin",
  recipientId = null,
}: {
  unreadCount?: number;
  href: string;
  recipientType?: "admin" | "student";
  recipientId?: number | null;
}) {
  const count = useUnreadNotifications(recipientType, recipientId, unreadCount);
  return (
    <Link
      href={href}
      aria-label={`Notifications, ${count} unread`}
      className="relative inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary"
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1">
          <UnreadBadge count={count} />
        </span>
      )}
    </Link>
  );
}
