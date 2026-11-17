import { requireAdminPage } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Inbox } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { RescheduleActions } from "@/components/reschedule-actions";
import type { RescheduleRequestWithDetails } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function RescheduleRequestsPage() {
  await requireAdminPage();
  const requests = await queryAll<RescheduleRequestWithDetails>(
    `SELECT rr.*,s.name AS student_name,s.subject,c.scheduled_at FROM reschedule_requests rr JOIN students s ON s.id=rr.student_id JOIN classes c ON c.id=rr.class_id ORDER BY rr.created_at DESC,rr.id DESC`,
  );
  const pending = requests.filter((r) => r.status === "pending"),
    past = requests.filter((r) => r.status !== "pending");
  return (
    <>
      <PageHeader
        title="Reschedule Requests"
        subtitle={
          pending.length
            ? `${pending.length} awaiting a decision`
            : "All caught up"
        }
      />
      {!requests.length ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-3" />
          <p>No reschedule requests yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section aria-labelledby="pending-requests-title">
              <h2
                id="pending-requests-title"
                className="mb-4 text-xl font-semibold"
              >
                New requests
              </h2>
              <div className="space-y-3">
                {pending.map((req) => (
                  <article
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
                        <CalendarClock size={22} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold break-words">
                          {req.student_name} requested to reschedule
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {fmtDateTime(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <RescheduleActions
                      requestId={req.id}
                      preferredTimes={
                        [
                          req.preferred_time_1,
                          req.preferred_time_2,
                          req.preferred_time_3,
                        ].filter(Boolean) as string[]
                      }
                      studentName={req.student_name}
                      originalTime={req.scheduled_at}
                      reason={req.reason}
                    />
                  </article>
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section aria-labelledby="past-requests-title">
              <h2
                id="past-requests-title"
                className="mb-4 text-xl font-semibold"
              >
                Past requests
              </h2>
              <div className="space-y-4">
                {past.map((req) => (
                  <article
                    key={req.id}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold">{req.student_name}</h3>
                      <Badge
                        variant="outline"
                        className={
                          req.status === "approved"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-700"
                        }
                      >
                        {req.status === "approved" ? "Approved" : "Declined"}
                      </Badge>
                    </div>
                    <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                          Original class
                        </dt>
                        <dd className="mt-1 font-medium">
                          {fmtDateTime(req.scheduled_at)}
                        </dd>
                      </div>
                      {req.status === "approved" && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Approved time
                          </dt>
                          <dd className="mt-1 font-semibold text-emerald-700">
                            {req.approved_time
                              ? fmtDateTime(req.approved_time)
                              : "Not recorded"}
                          </dd>
                        </div>
                      )}
                      {req.reason && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Reason
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words">
                            {req.reason}
                          </dd>
                        </div>
                      )}
                      {req.admin_note && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Your note
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words">
                            {req.admin_note}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
