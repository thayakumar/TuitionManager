import { NotificationReadLink } from "@/components/notification-read-link";
import { NotificationReadAction } from "@/components/notification-actions";
import Link from "next/link";
import { Bell, CheckCheck, Check } from "lucide-react";
import { ownStudentContext } from "@/lib/portal-context";
import {
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fmtDateTime } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function StudentNotificationsPage({
  params: paramsPromise,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const params = await paramsPromise;
  const student = await ownStudentContext(Number(params.studentId));
  const { notifications, unreadCount } = await getNotificationSummary(
    "student",
    student.id,
  );
  const markAll = markAllNotificationsRead.bind(null, "student", student.id);
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount
            ? `${unreadCount} unread · Updates about your lessons and classwork`
            : "You're all caught up"
        }
        action={
          unreadCount > 0 ? (
            <NotificationReadAction
              recipientType="student"
              recipientId={student.id}
            />
          ) : undefined
        }
      />
      {notifications.length ? (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={!n.read ? "border-primary/20 bg-primary/5" : ""}
            >
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bell size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">
                      {n.link &&
                      (n.link === `/portal/student/${student.id}` ||
                        n.link.startsWith(`/portal/student/${student.id}/`)) ? (
                        <NotificationReadLink id={n.id} href={n.link}>
                          {n.title}
                        </NotificationReadLink>
                      ) : (
                        n.title
                      )}
                    </h2>
                    {!n.read && (
                      <span
                        className="size-2 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {fmtDateTime(n.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {!n.read && <NotificationReadAction id={n.id} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Bell className="mx-auto mb-3 text-primary/50" />
          <h2 className="font-semibold">No notifications yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your tutor's lesson and classwork updates will appear here.
          </p>
        </div>
      )}
    </>
  );
}
