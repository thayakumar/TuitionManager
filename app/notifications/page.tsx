import { NotificationReadAction } from "@/components/notification-actions";
import { NotificationReadLink } from "@/components/notification-read-link";
import { requireAdminPage } from "@/lib/auth";

import {
  Bell,
  CheckCheck,
  CalendarClock,
  BookOpen,
  FileText,
  Megaphone,
} from "lucide-react";
import { queryAll, queryOne, execute } from "@/lib/db";
import { markAllNotificationsRead } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

export const dynamic = "force-dynamic";

function iconForType(type: string) {
  switch (type) {
    case "reschedule_request":
    case "reschedule_approved":
    case "reschedule_rejected":
      return <CalendarClock size={16} className="text-orange-500" />;
    case "new_material":
    case "new_assignment":
      return <BookOpen size={16} className="text-emerald-500" />;
    case "class_scheduled":
    case "class_cancelled":
      return <FileText size={16} className="text-amber-500" />;
    default:
      return <Megaphone size={16} className="text-orange-500" />;
  }
}

export default async function NotificationsPage() {
  await requireAdminPage();
  const [notifications, summary] = await Promise.all([
    queryAll<AppNotification>(
      `SELECT * FROM notifications WHERE recipient_type = 'admin' ORDER BY created_at DESC,id DESC LIMIT 50`,
    ),
    queryOne<{ unread: number }>(
      "SELECT COUNT(*) AS unread FROM notifications WHERE recipient_type='admin' AND read=0",
    ),
  ]);

  const markAllRead = markAllNotificationsRead.bind(null, "admin", null);

  const unread = Number(summary?.unread ?? 0);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={
          unread > 0
            ? `${unread} unread · showing the latest50 messages`
            : "All caught up · showing the latest50 messages"
        }
        action={
          unread > 0 ? (
            <NotificationReadAction recipientType="admin" />
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card className="border shadow-none">
          <CardContent className="py-12 text-center">
            <Bell size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`border shadow-none transition-colors ${!n.read ? "bg-orange-50/40 border-l-2 border-l-orange-500" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 shrink-0 mt-0.5">
                    {iconForType(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}
                      >
                        {n.link ? (
                          <NotificationReadLink id={n.id} href={n.link}>
                            {n.title}
                          </NotificationReadLink>
                        ) : (
                          n.title
                        )}
                      </p>
                      {!n.read && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmtDateTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
