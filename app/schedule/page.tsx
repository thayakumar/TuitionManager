import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, Card, Button, Badge, EmptyState } from "@/components/ui";
import { fmtDateTime, fmtDate } from "@/lib/format";
import type { ClassWithStudent } from "@/lib/types";
import { startOfDay, endOfDay, addDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  const now = new Date();
  const startISO = startOfDay(now).toISOString();
  const endISO = endOfDay(addDays(now, 30)).toISOString();

  const upcoming = db()
    .prepare(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at BETWEEN ? AND ?
       ORDER BY c.scheduled_at`
    )
    .all(startISO, endISO) as ClassWithStudent[];

  const past = db()
    .prepare(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at < ?
       ORDER BY c.scheduled_at DESC
       LIMIT 20`
    )
    .all(startISO) as ClassWithStudent[];

  // group upcoming by day
  const grouped = new Map<string, ClassWithStudent[]>();
  for (const c of upcoming) {
    const day = format(new Date(c.scheduled_at), "yyyy-MM-dd");
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(c);
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="Next 30 days"
        action={
          <Link href="/schedule/new">
            <Button variant="primary">
              <CalendarPlus size={16} /> Schedule class
            </Button>
          </Link>
        }
      />

      {upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming classes"
          description="Schedule your next class to see it here."
          action={
            <Link href="/schedule/new">
              <Button variant="primary">
                <CalendarPlus size={16} /> Schedule class
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([day, items]) => (
            <div key={day}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {fmtDate(day + "T00:00:00")}
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`}>
                    <Card className="hover:border-brand-500 py-3 mb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">
                            {format(new Date(c.scheduled_at), "h:mm a")} · {c.student_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.duration_minutes} min · {c.subject || "Lesson"}
                            {c.location && ` · ${c.location}`}
                          </div>
                        </div>
                        <Badge
                          tone={
                            c.status === "completed"
                              ? "green"
                              : c.status === "canceled"
                                ? "red"
                                : "blue"
                          }
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent past</h2>
          <div className="space-y-2">
            {past.map((c) => (
              <Link key={c.id} href={`/classes/${c.id}`}>
                <Card className="hover:border-brand-500 py-3 mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">
                        {fmtDateTime(c.scheduled_at)} · {c.student_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.attendance || "no attendance"} · {c.duration_minutes} min
                      </div>
                    </div>
                    <Badge
                      tone={
                        c.status === "completed"
                          ? "green"
                          : c.status === "canceled"
                            ? "red"
                            : "slate"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
