import Link from "next/link";
import { CalendarPlus, Repeat } from "lucide-react";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime, fmtDate } from "@/lib/format";
import type { ClassWithStudent } from "@/lib/types";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { ExportButton } from "@/components/export-button";
import { exportClassesCsv } from "@/lib/export";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "canceled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default async function SchedulePage() {
  const now = new Date();
  const startISO = startOfDay(now).toISOString();
  const endISO = endOfDay(addDays(now, 30)).toISOString();

  const [upcoming, past] = await Promise.all([
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at BETWEEN ? AND ?
       ORDER BY c.scheduled_at`,
      [startISO, endISO]
    ),
    queryAll<ClassWithStudent>(
      `SELECT c.*, s.name AS student_name, s.hourly_rate
       FROM classes c JOIN students s ON s.id = c.student_id
       WHERE c.scheduled_at < ?
       ORDER BY c.scheduled_at DESC
       LIMIT 20`,
      [startISO]
    ),
  ]);

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
          <div className="flex gap-2">
            <ExportButton getData={exportClassesCsv} filename="classes.csv" />
            <Link href="/schedule/recurring/new">
              <Button variant="secondary">
                <Repeat size={16} /> Recurring
              </Button>
            </Link>
            <Link href="/schedule/new">
              <Button>
                <CalendarPlus size={16} /> Schedule class
              </Button>
            </Link>
          </div>
        }
      />

      {upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming classes"
          description="Schedule your next class to see it here."
          action={
            <Link href="/schedule/new">
              <Button>
                <CalendarPlus size={16} /> Schedule class
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([day, items]) => (
            <div key={day}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {fmtDate(day + "T00:00:00")}
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`}>
                    <Card className={`hover:border-primary py-3 mb-2 cursor-pointer transition ${c.status === "canceled" ? "opacity-60" : ""}`}>
                      <CardContent className="py-0 flex justify-between items-center">
                        <div className={c.status === "canceled" ? "line-through" : ""}>
                          <div className="text-sm font-medium">
                            {format(new Date(c.scheduled_at), "h:mm a")} · {c.student_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.duration_minutes} min · {c.subject || "Lesson"}
                            {c.location && ` · ${c.location}`}
                          </div>
                        </div>
                        <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      </CardContent>
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
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent past</h2>
          <div className="space-y-2">
            {past.map((c) => (
              <Link key={c.id} href={`/classes/${c.id}`}>
                <Card className="hover:border-primary py-3 mb-2 cursor-pointer transition">
                  <CardContent className="py-0 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">
                        {fmtDateTime(c.scheduled_at)} · {c.student_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.attendance || "no attendance"} · {c.duration_minutes} min
                      </div>
                    </div>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
