import Link from "next/link";
import { Bell, CheckCheck, CalendarClock, BookOpen, FileText, Megaphone } from "lucide-react";
import { queryAll, execute } from "@/lib/db";
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
      return <CalendarClock size={16} className="text-indigo-500" />;
    case "new_material":
    case "new_assignment":
      return <BookOpen size={16} className="text-emerald-500" />;
    case "class_scheduled":
    case "class_cancelled":
      return <FileText size={16} className="text-amber-500" />;
    default:
      return <Megaphone size={16} className="text-violet-500" />;
  }
}

export default async function NotificationsPage() {
  const notifications = await queryAll<AppNotification>(
    `SELECT * FROM notifications WHERE recipient_type = 'admin' ORDER BY created_at DESC LIMIT 50`
  );

  const markAllRead = markAllNotificationsRead.bind(null, "admin", null);

  const unread = notifications.filter((n) => !n.read);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread.length > 0 ? `${unread.length} unread` : "All caught up"}
        action={
          unread.length > 0 ? (
            <form action={markAllRead}>
              <Button variant="outline" size="sm">
                <CheckCheck size={14} /> Mark all read
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="py-12 text-center">
            <Bell size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`shadow-sm border-0 transition-colors ${!n.read ? "bg-indigo-50/30 border-l-2 border-l-indigo-500" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 shrink-0 mt-0.5">
                    {iconForType(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {!n.read && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(n.created_at)}</p>
                  </div>
                  {n.link && (
                    <Link href={n.link}>
                      <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                        View
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
