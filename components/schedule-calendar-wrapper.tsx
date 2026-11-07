"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pencil, Trash2, X as XIcon, Copy, Video, Check, Clock,
  MapPin, Calendar, ExternalLink, Ban,
} from "lucide-react";
import { EventCalendar } from "@/components/reui/event-calendar/event-calendar";
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content";
import {
  EventCalendarNav,
  EventCalendarToolbar,
} from "@/components/reui/event-calendar/event-calendar-nav";
import type {
  CalendarEvent,
  EventCalendarSlotInfo,
  EventCalendarOccurrence,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClassQuick, markAttendance, deleteClassQuick, cancelClassQuick, rescheduleClassQuick } from "@/lib/actions";
import { format, addMinutes, addDays } from "date-fns";
import type { Attendance } from "@/lib/types";

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
  meeting_notes: string | null;
};

type Student = { id: number; name: string; subject: string | null };

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#818CF8",
  completed: "#34D399",
  canceled: "#F87171",
};

export function ScheduleCalendarWrapper({
  classes,
  students,
}: {
  classes: ClassData[];
  students: Student[];
}) {
  const router = useRouter();

  // Add-class dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddPending, startAddTransition] = useTransition();

  // Event detail popover state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isActionPending, startActionTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Reschedule dialog state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelledClassId, setCancelledClassId] = useState<number | null>(null);
  const [isReschedulePending, startRescheduleTransition] = useTransition();

  const events: CalendarEvent[] = classes.map((c) => ({
    id: String(c.id),
    title: `${c.student_name}${c.subject ? ` · ${c.subject}` : ""}`,
    start: new Date(c.scheduled_at),
    end: new Date(
      new Date(c.scheduled_at).getTime() + c.duration_minutes * 60000
    ),
    color: STATUS_COLORS[c.status] ?? "#818CF8",
    data: c,
  }));

  function handleSlotClick(slot: EventCalendarSlotInfo) {
    setSelectedDate(slot.date);
    setAddDialogOpen(true);
  }

  function handleEventClick(occ: EventCalendarOccurrence) {
    const c = occ.event.data as ClassData;
    setSelectedClass(c);
    setDetailOpen(true);
    setCopied(false);
  }

  function handleAddSubmit(formData: FormData) {
    startAddTransition(async () => {
      await createClassQuick(formData);
      setAddDialogOpen(false);
      router.refresh();
    });
  }

  function handleAttendance(attendance: Attendance) {
    if (!selectedClass) return;
    startActionTransition(async () => {
      await markAttendance(selectedClass.id, attendance);
      setDetailOpen(false);
      router.refresh();
    });
  }

  function handleCancel() {
    if (!selectedClass) return;
    startActionTransition(async () => {
      await cancelClassQuick(selectedClass.id);
      setCancelledClassId(selectedClass.id);
      setDetailOpen(false);
      setRescheduleOpen(true);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!selectedClass) return;
    startActionTransition(async () => {
      await cancelClassQuick(selectedClass.id);
      setCancelledClassId(selectedClass.id);
      setDetailOpen(false);
      setRescheduleOpen(true);
      router.refresh();
    });
  }

  function handleRescheduleSubmit(formData: FormData) {
    if (!cancelledClassId) return;
    const scheduledAt = String(formData.get("reschedule_date") || "");
    if (!scheduledAt) return;
    startRescheduleTransition(async () => {
      await rescheduleClassQuick(cancelledClassId, scheduledAt);
      setRescheduleOpen(false);
      setCancelledClassId(null);
      router.refresh();
    });
  }

  function copyMeetingLink() {
    if (!selectedClass?.meeting_room) return;
    navigator.clipboard.writeText(`https://meet.jit.si/${selectedClass.meeting_room}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const dateOnly = format(selectedDate, "yyyy-MM-dd");

  // Format event detail date
  const detailStart = selectedClass ? new Date(selectedClass.scheduled_at) : null;
  const detailEnd = detailStart && selectedClass
    ? addMinutes(detailStart, selectedClass.duration_minutes)
    : null;
  const detailDateStr = detailStart
    ? `${format(detailStart, "EEEE, MMMM d")} · ${format(detailStart, "h:mm a")} – ${detailEnd ? format(detailEnd, "h:mm a") : ""}`
    : "";

  return (
    <>
      <EventCalendar
        events={events}
        defaultView="month"
        onSlotClick={handleSlotClick}
        onEventClick={handleEventClick}
        className="h-[500px] sm:h-[640px] lg:h-[720px] w-full rounded-xl border bg-card text-card-foreground shadow-sm"
        renderEvent={({ occurrence }) => {
          const data = occurrence.event.data as ClassData;
          return (
            <div className="flex items-center gap-1 w-full min-w-0">
              <span className="truncate font-medium">{occurrence.event.title}</span>
              {data?.meeting_room && (
                <span className="shrink-0 flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                  <Video size={10} className="text-white" />
                </span>
              )}
            </div>
          );
        }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-2">
          <EventCalendarNav className="min-w-0 flex-1" />
          <EventCalendarToolbar />
        </div>
        <EventCalendarContent />
      </EventCalendar>

      {/* ─── Event Detail Popover (Google Calendar style) ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
          {selectedClass && (
            <>
              {/* Top toolbar */}
              <div className="flex items-center justify-end gap-1 px-3 pt-3">
                <Link href={`/classes/${selectedClass.id}`}>
                  <Button variant="ghost" size="icon-sm" title="Edit">
                    <Pencil size={14} />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Delete"
                  onClick={handleDelete}
                  disabled={isActionPending}
                >
                  <Trash2 size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDetailOpen(false)}
                >
                  <XIcon size={14} />
                </Button>
              </div>

              {/* Title + date */}
              <div className="px-5 pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-1.5 size-3 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[selectedClass.status] ?? "#818CF8" }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-foreground leading-tight">
                      {selectedClass.student_name}
                      {selectedClass.subject ? ` · ${selectedClass.subject}` : ""}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {detailDateStr}
                    </p>
                    {selectedClass.is_trial ? (
                      <Badge variant="outline" className="text-[10px] mt-1">TRIAL</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Meeting link */}
              {selectedClass.meeting_room && (
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/meeting/${selectedClass.id}`}
                      target="_blank"
                      className="flex-1"
                    >
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Video size={16} /> Join Meeting
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyMeetingLink}
                      title="Copy meeting link"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate font-mono">
                    meet.jit.si/{selectedClass.meeting_room}
                  </p>
                </div>
              )}

              {/* Location */}
              {selectedClass.location && (
                <div className="px-5 pb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} className="shrink-0" />
                  {selectedClass.location}
                </div>
              )}

              {/* Meeting Notes */}
              {selectedClass.meeting_notes && (
                <div className="px-5 pb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Class Notes
                  </p>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-foreground whitespace-pre-wrap">
                    {selectedClass.meeting_notes}
                  </div>
                </div>
              )}

              <Separator />

              {/* Attendance / status actions */}
              <div className="px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Attendance
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedClass.attendance === "present" ? "default" : "outline"}
                    className={selectedClass.attendance === "present"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"}
                    onClick={() => handleAttendance("present")}
                    disabled={isActionPending}
                  >
                    <Check size={14} /> Present
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedClass.attendance === "late" ? "default" : "outline"}
                    className={selectedClass.attendance === "late"
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "text-amber-700 border-amber-200 hover:bg-amber-50"}
                    onClick={() => handleAttendance("late")}
                    disabled={isActionPending}
                  >
                    <Clock size={14} /> Late
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedClass.attendance === "absent" ? "default" : "outline"}
                    className={selectedClass.attendance === "absent"
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "text-red-700 border-red-200 hover:bg-red-50"}
                    onClick={() => handleAttendance("absent")}
                    disabled={isActionPending}
                  >
                    <XIcon size={14} /> Absent
                  </Button>
                  {selectedClass.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-700 border-gray-200 hover:bg-gray-50"
                      onClick={handleCancel}
                      disabled={isActionPending}
                    >
                      <Ban size={14} /> Cancel
                    </Button>
                  )}
                </div>

                {selectedClass.status !== "scheduled" && (
                  <div className="mt-2">
                    <Badge
                      variant={selectedClass.status === "completed" ? "default" : "destructive"}
                      className="text-[10px] capitalize"
                    >
                      {selectedClass.status}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              {/* View details link */}
              <div className="px-5 py-3">
                <Link
                  href={`/classes/${selectedClass.id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  <ExternalLink size={14} /> View full details
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reschedule Dialog ─── */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reschedule Class?</DialogTitle>
            <DialogDescription>
              This class has been cancelled and marked absent. Would you like to reschedule it?
            </DialogDescription>
          </DialogHeader>
          <form action={handleRescheduleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule_date">New date &amp; time</Label>
              <input
                type="datetime-local"
                id="reschedule_date"
                name="reschedule_date"
                required
                defaultValue={format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => { setRescheduleOpen(false); setCancelledClassId(null); }}>
                No thanks
              </Button>
              <Button type="submit" disabled={isReschedulePending}>
                {isReschedulePending ? "Rescheduling..." : "Reschedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Add Class Dialog ─── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a Class</DialogTitle>
            <DialogDescription>
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          <form action={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student_id">Student</Label>
              <select
                id="student_id"
                name="student_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Date &amp; Time</Label>
                <input
                  type="datetime-local"
                  id="scheduled_at"
                  name="scheduled_at"
                  defaultValue={`${dateOnly}T09:00`}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duration (min)</Label>
                <input
                  type="number"
                  id="duration_minutes"
                  name="duration_minutes"
                  defaultValue={60}
                  min={15}
                  step={15}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder="e.g. Mathematics"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  placeholder="e.g. Online"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_trial"
                name="is_trial"
                className="rounded"
              />
              <Label htmlFor="is_trial" className="text-sm font-normal">
                Trial class
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAddPending}>
                {isAddPending ? "Scheduling..." : "Schedule Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
