import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Inbox } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { RescheduleActions } from "@/components/reschedule-actions";
import type { RescheduleRequestWithDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "approved":
      return <Badge variant="default">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function RescheduleRequestsPage() {
  const requests = await queryAll<RescheduleRequestWithDetails>(
    `SELECT rr.*, s.name AS student_name, s.subject, c.scheduled_at
     FROM reschedule_requests rr
     JOIN students s ON s.id = rr.student_id
     JOIN classes c ON c.id = rr.class_id
     ORDER BY CASE rr.status WHEN 'pending' THEN 0 ELSE 1 END, rr.created_at DESC`
  );

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <>
      <PageHeader
        title="Reschedule Requests"
        subtitle={pending.length > 0 ? `${pending.length} pending` : "All caught up"}
      />

      {requests.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Inbox size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No reschedule requests yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock size={16} className="text-indigo-500" />
                    {req.student_name}
                    {req.subject && (
                      <span className="text-sm font-normal text-muted-foreground">— {req.subject}</span>
                    )}
                  </CardTitle>
                  {statusBadge(req.status)}
                </div>
                <CardDescription>
                  Original class: {fmtDateTime(req.scheduled_at)} · Requested {fmtDateTime(req.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {req.reason && (
                  <p className="text-sm text-foreground mb-3">
                    <span className="font-medium">Reason:</span> {req.reason}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="rounded-lg border border-border/50 px-3 py-1.5 text-sm">
                    <span className="text-xs text-muted-foreground">Option 1: </span>
                    <span className="font-medium">{fmtDateTime(req.preferred_time_1)}</span>
                  </div>
                  {req.preferred_time_2 && (
                    <div className="rounded-lg border border-border/50 px-3 py-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">Option 2: </span>
                      <span className="font-medium">{fmtDateTime(req.preferred_time_2)}</span>
                    </div>
                  )}
                  {req.preferred_time_3 && (
                    <div className="rounded-lg border border-border/50 px-3 py-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">Option 3: </span>
                      <span className="font-medium">{fmtDateTime(req.preferred_time_3)}</span>
                    </div>
                  )}
                </div>

                {req.status === "pending" && (
                  <RescheduleActions
                    requestId={req.id}
                    preferredTimes={[req.preferred_time_1, req.preferred_time_2, req.preferred_time_3].filter(Boolean) as string[]}
                  />
                )}

                {req.admin_note && req.status !== "pending" && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Admin note:</span> {req.admin_note}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
