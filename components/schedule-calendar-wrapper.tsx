"use client";
import { ScheduleFields, DateTimeField } from "@/components/scheduling-fields";
import { actionError } from "@/lib/action-errors";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Check, Copy, ExternalLink, Video, X } from "lucide-react";
import { toast } from "sonner";
import { EventCalendar } from "@/components/reui/event-calendar/event-calendar";
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav";
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content";
import type {
  CalendarEvent,
  EventCalendarProposedUpdate,
  EventCalendarSlotInfo,
} from "@/components/reui/event-calendar/event-calendar-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { lessonStatus } from "@/lib/lesson-status";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  createClassQuick,
  markAttendance,
  cancelClassQuick,
  moveClassQuick,
  rescheduleClassQuick,
} from "@/lib/actions";
import { fmtDateInput, fmtDateTime } from "@/lib/format";

type ClassData = {
  id: number;
  student_name: string;
  scheduled_at: string;
  duration_minutes: number;
  subject: string | null;
  location: string | null;
  status: string;
  attendance: string | null;
  is_trial: number;
  meeting_room: string | null;
  teacher_notes: string | null;
};
type Student = { id: number; name: string; subject: string | null };
const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ScheduleCalendarWrapper({
  classes,
  students,
  month,
}: {
  classes: ClassData[];
  students: Student[];
  month: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [add, setAdd] = useState<{ date: string; duration: number } | null>(
    null,
  );
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [proposal, setProposal] = useState<EventCalendarProposedUpdate | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const selected = classes.find((c) => c.id === selectedId);
  const events: CalendarEvent[] = useMemo(
    () =>
      classes.map((c) => ({
        id: String(c.id),
        title: `${c.student_name}${c.subject ? ` · ${c.subject}` : ""}`,
        start: new Date(c.scheduled_at),
        end: new Date(
          new Date(c.scheduled_at).getTime() + c.duration_minutes * 60000,
        ),
        color: lessonStatus(c.status, c.attendance).color,
        readOnly: c.status !== "scheduled",
        data: c,
      })),
    [classes],
  );
  function run(
    action: () => Promise<unknown>,
    message: string,
    done?: () => void,
  ) {
    setError(null);
    setPending(true);
    void (async () => {
      try {
        await action();
        toast.success(message);
        done?.();
        router.refresh();
      } catch (e) {
        setError(
          actionError(e, "The change could not be saved. Please try again."),
        );
      } finally {
        setPending(false);
      }
    })();
  }
  function slot(slot: EventCalendarSlotInfo) {
    setError(null);
    const value = fmtDateInput(slot.date.toISOString());
    setAdd({
      date: slot.allDay ? `${value.slice(0, 10)}T09:00` : value,
      duration: slot.end
        ? Math.max(
            15,
            Math.round((slot.end.getTime() - slot.date.getTime()) / 60000),
          )
        : 60,
    });
  }
  const feedback = error && (
    <p
      role="alert"
      className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
    >
      {error}
    </p>
  );
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Times are shown in Malaysia time (MYT). Drag a scheduled class to
        propose a change; you will confirm before it is saved.
      </p>
      <div
        className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
        aria-label="Lesson status colours"
      >
        {[
          { status: "scheduled", attendance: null },
          { status: "completed", attendance: "present" },
          { status: "completed", attendance: "absent" },
          { status: "canceled", attendance: null },
        ].map((item) => {
          const state = lessonStatus(item.status, item.attendance);
          return (
            <span className="inline-flex items-center gap-2" key={state.key}>
              <span className={`size-2.5 rounded-full ${state.dotClassName}`} />
              {state.label}
            </span>
          );
        })}
      </div>
      <EventCalendar
        events={events}
        timeZone="Asia/Kuala_Lumpur"
        defaultView="month"
        defaultDate={new Date(`${month}-15T04:00:00Z`)}
        onDateChange={(date) => {
          const next = fmtDateInput(date.toISOString()).slice(0, 7);
          if (next !== month)
            router.replace(`/schedule?month=${next}`, { scroll: false });
        }}
        onSlotClick={slot}
        onSelectSlot={(s) =>
          slot({ date: s.start, end: s.end, allDay: s.allDay, view: s.view })
        }
        canDropEvent={(u) =>
          (u.event.data as ClassData | undefined)?.status === "scheduled" &&
          !u.allDay &&
          u.end > u.start
        }
        onDragBlocked={() =>
          toast.info("Only scheduled classes can be moved or resized.")
        }
        onEventUpdate={(u) => {
          setError(null);
          setProposal(u);
          return false;
        }}
        onEventClick={(o) => {
          setError(null);
          setCopied(false);
          setSelectedId(Number(o.event.id));
        }}
        loading={pending}
        className="h-[560px] w-full rounded-xl border bg-card shadow-sm lg:h-[740px]"
      >
        <EventCalendarNav />
        <EventCalendarContent />
      </EventCalendar>

      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v && !pending) setSelectedId(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.student_name}
              {selected?.subject ? ` · ${selected.subject}` : ""}
            </DialogTitle>
            <DialogDescription>
              {selected ? fmtDateTime(selected.scheduled_at) : ""} ·{" "}
              {selected?.duration_minutes} minutes · MYT
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="flex gap-2">
                <LessonStatusBadge
                  status={selected.status}
                  attendance={selected.attendance}
                />
                {!!selected.is_trial && (
                  <Badge variant="secondary">Trial · free</Badge>
                )}
                <Badge variant="outline">
                  {selected.attendance || "Attendance not marked"}
                </Badge>
              </div>
              {selected.location && (
                <p className="text-sm">{selected.location}</p>
              )}
              {selected.teacher_notes && (
                <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                  <strong>Private teacher notes</strong>
                  <p>{selected.teacher_notes}</p>
                </div>
              )}
              {selected.meeting_room && selected.status !== "canceled" && (
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/meeting/${selected.id}`}>
                      <Video size={16} /> Join meeting
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    title="Copy meeting link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/meeting/${selected.id}`,
                        );
                        setCopied(true);
                      } catch {
                        toast.error(
                          "Could not copy the link. Open class details to share it.",
                        );
                      }
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
              )}
              {selected.status !== "canceled" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Record attendance</p>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        selected.attendance === "present"
                          ? "default"
                          : "outline"
                      }
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => markAttendance(selected.id, "present"),
                          "Marked present",
                          () => setSelectedId(null),
                        )
                      }
                    >
                      <Check size={16} /> Present
                    </Button>
                    <Button
                      variant={
                        selected.attendance === "absent" ? "default" : "outline"
                      }
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => markAttendance(selected.id, "absent"),
                          "Marked absent — no charge",
                          () => setSelectedId(null),
                        )
                      }
                    >
                      <X size={16} /> Absent
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Absent means a missed session and is free. Use Cancel for
                    advance notice.
                  </p>
                </div>
              )}
              {selected.status === "scheduled" && (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setCancelId(selected.id);
                    setSelectedId(null);
                  }}
                >
                  <Ban size={16} /> Cancel class
                </Button>
              )}
              {selected.status === "canceled" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setRescheduleId(selected.id);
                    setSelectedId(null);
                  }}
                >
                  Schedule replacement
                </Button>
              )}
              {feedback}
              <Button asChild variant="secondary">
                <Link href={`/classes/${selected.id}`}>
                  <ExternalLink size={16} /> View full details
                </Link>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelId !== null}
        onOpenChange={(v) => {
          if (!v && !pending) setCancelId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this class?</DialogTitle>
            <DialogDescription>
              The original class stays in your records as canceled and free.
              This is different from marking a student absent.
            </DialogDescription>
          </DialogHeader>
          {feedback}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setCancelId(null)}
            >
              Keep class
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                cancelId !== null &&
                run(
                  () => cancelClassQuick(cancelId),
                  "Class canceled",
                  () => {
                    setRescheduleId(cancelId);
                    setCancelId(null);
                  },
                )
              }
            >
              {pending ? "Canceling…" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rescheduleId !== null}
        onOpenChange={(v) => {
          if (!v && !pending) setRescheduleId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a replacement?</DialogTitle>
            <DialogDescription>
              The original remains canceled. The replacement keeps its student,
              duration and trial status.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(f) => {
              const date = String(f.get("reschedule_date") || "");
              if (rescheduleId !== null)
                run(
                  () => rescheduleClassQuick(rescheduleId, date),
                  "Replacement scheduled",
                  () => setRescheduleId(null),
                );
            }}
            className="space-y-4"
          >
            <DateTimeField
              name="reschedule_date"
              label="Replacement date"
              required
              defaultValue={fmtDateInput(
                new Date(Date.now() + 86400000).toISOString(),
              )}
            />
            {feedback}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setRescheduleId(null)}
              >
                No replacement
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Scheduling…" : "Schedule replacement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={proposal !== null}
        onOpenChange={(v) => {
          if (!v && !pending) setProposal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm schedule change</DialogTitle>
            <DialogDescription>{proposal?.event.title}</DialogDescription>
          </DialogHeader>
          {proposal && (
            <>
              <p className="text-sm">
                New time: {fmtDateTime(proposal.start.toISOString())} (MYT)
              </p>
              <p className="text-sm">
                Duration:{" "}
                {Math.round(
                  (proposal.end.getTime() - proposal.start.getTime()) / 60000,
                )}{" "}
                minutes
              </p>
              <p className="text-xs text-muted-foreground">
                We check for overlapping classes before saving. Other classes
                are unchanged.
              </p>
              {feedback}
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => setProposal(null)}
                >
                  Keep original
                </Button>
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        moveClassQuick(
                          Number(proposal.event.id),
                          proposal.start.toISOString(),
                          Math.round(
                            (proposal.end.getTime() -
                              proposal.start.getTime()) /
                              60000,
                          ),
                        ),
                      "Schedule updated",
                      () => setProposal(null),
                    )
                  }
                >
                  {pending ? "Saving…" : "Confirm change"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!add}
        onOpenChange={(v) => {
          if (!v && !pending) setAdd(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan a lesson</DialogTitle>
            <DialogDescription>
              A clear plan, from student to start time. All times are MYT.
            </DialogDescription>
          </DialogHeader>
          {add && (
            <form
              key={add.date}
              action={(f) =>
                run(
                  () => createClassQuick(f),
                  "Class scheduled",
                  () => setAdd(null),
                )
              }
              className="space-y-4"
            >
              <fieldset disabled={pending} className="min-w-0 border-0 p-0">
                <ScheduleFields
                  students={students}
                  defaultDateTime={add.date}
                  defaultDuration={add.duration}
                />
              </fieldset>
              {feedback}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setAdd(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !students.length}>
                  {pending ? "Scheduling…" : "Schedule class"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
