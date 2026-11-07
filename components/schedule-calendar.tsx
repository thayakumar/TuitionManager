"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

type ClassItem = {
  id: number;
  student_name: string;
  scheduled_at: string;
  duration_minutes: number;
  subject: string | null;
  location: string | null;
  status: string;
  attendance: string | null;
  is_trial: number;
};

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

function statusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-foreground";
    case "canceled":
      return "bg-destructive";
    default:
      return "bg-foreground/50";
  }
}

export function ScheduleCalendar({ classes }: { classes: ClassItem[] }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  const classDates = useMemo(() => {
    const map = new Map<string, ClassItem[]>();
    for (const c of classes) {
      const key = format(parseISO(c.scheduled_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [classes]);

  const daysWithClasses = useMemo(() => {
    return Array.from(classDates.keys()).map((d) => parseISO(d));
  }, [classDates]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedClasses = classDates.get(selectedKey) ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
      <div className="lg:sticky lg:top-8 self-start">
        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={month}
              onMonthChange={setMonth}
              modifiers={{ hasClass: daysWithClasses }}
              modifiersClassNames={{ hasClass: "has-class-dot" }}
              className="w-full"
            />
            <style>{`
              .has-class-dot { position: relative; }
              .has-class-dot::after {
                content: '';
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: var(--foreground);
              }
            `}</style>
          </CardContent>
          <div className="px-4 pb-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-foreground/50" />
                Scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-foreground" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-destructive" />
                Canceled
              </span>
            </div>
          </div>
        </Card>

        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-semibold text-foreground">
                  {classes.filter((c) => c.status === "scheduled").length}
                </div>
                <div className="text-[10px] text-muted-foreground">Upcoming</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">
                  {classes.filter((c) => c.status === "completed").length}
                </div>
                <div className="text-[10px] text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">
                  {classes.filter((c) => c.status === "canceled").length}
                </div>
                <div className="text-[10px] text-muted-foreground">Canceled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              <Badge variant="outline">{selectedClasses.length} class{selectedClasses.length !== 1 ? "es" : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedClasses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <div className="text-sm">No classes on this date</div>
                <div className="text-xs mt-1">Select a day with a dot to see classes</div>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedClasses
                  .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
                  .map((c) => (
                    <Link key={c.id} href={`/classes/${c.id}`} className="block">
                      <div
                        className={cn(
                          "group relative flex items-start gap-3 rounded-lg border p-3 transition-all hover:bg-secondary/50 hover:shadow-sm",
                          c.status === "canceled" && "opacity-60"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                          <span className="text-sm font-semibold text-foreground">
                            {format(parseISO(c.scheduled_at), "h:mm")}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {format(parseISO(c.scheduled_at), "a")}
                          </span>
                        </div>

                        <div className="flex flex-col items-center self-stretch py-0.5">
                          <div className={cn("size-2 rounded-full shrink-0", statusColor(c.status))} />
                          <div className="w-px flex-1 bg-border mt-1" />
                        </div>

                        <div className={cn("flex-1 min-w-0", c.status === "canceled" && "line-through")}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {c.student_name}
                            </span>
                            <div className="flex gap-1.5 shrink-0">
                              {c.is_trial ? (
                                <Badge variant="outline" className="text-[10px]">
                                  TRIAL
                                </Badge>
                              ) : null}
                              <Badge variant={statusVariant(c.status)} className="text-[10px]">
                                {c.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {c.duration_minutes} min
                            </span>
                            {c.subject && (
                              <span className="flex items-center gap-1">
                                <BookOpen size={12} />
                                {c.subject}
                              </span>
                            )}
                            {c.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {c.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>This month&apos;s classes</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No classes this period
              </div>
            ) : (
              <div className="space-y-1">
                {Array.from(classDates.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([day, items]) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDate(parseISO(day))}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/50",
                        isSameDay(parseISO(day), selectedDate) && "bg-secondary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 text-center">
                          <div className="text-xs text-muted-foreground uppercase">
                            {format(parseISO(day), "EEE")}
                          </div>
                          <div className="text-lg font-semibold text-foreground leading-tight">
                            {format(parseISO(day), "d")}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {items.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).map((c) => (
                            <span
                              key={c.id}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                                c.status === "canceled"
                                  ? "bg-destructive/10 text-destructive line-through"
                                  : c.status === "completed"
                                    ? "bg-foreground/10 text-foreground"
                                    : "bg-secondary text-secondary-foreground"
                              )}
                            >
                              {format(parseISO(c.scheduled_at), "h:mm a")} · {c.student_name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {items.length}
                      </Badge>
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
