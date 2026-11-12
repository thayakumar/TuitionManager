import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { queryOne, getSetting } from "@/lib/db";
import { MeetingRoom } from "@/components/meeting-room";
import type { ClassRow, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: { classId: string } }) {
  const classId = Number(params.classId);
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  let isAdmin = false;
  if (sessionToken) {
    const stored = await getSetting("admin_session_token");
    isAdmin = !!stored && stored === sessionToken;
  }

  const cls = await queryOne<ClassRow>(
    isAdmin
      ? "SELECT * FROM classes WHERE id = ?"
      : `SELECT id, student_id, scheduled_at, duration_minutes, subject, location,
                status, attendance, recurrence_id, is_trial, cancel_reason,
                rescheduled_from, meeting_room, created_at
         FROM classes WHERE id = ?`,
    [classId]
  );
  if (!cls || !cls.meeting_room) notFound();

  const student = await queryOne<Student>("SELECT * FROM students WHERE id = ?", [cls.student_id]);
  if (!student) notFound();

  const scope = isAdmin ? "teacher" : "student";
  const notesRow = await queryOne<{ content: string }>(
    "SELECT content FROM class_notes WHERE class_id = ? AND scope = ?",
    [classId, scope]
  );

  return (
    <MeetingRoom
      classId={classId}
      roomName={cls.meeting_room}
      studentName={student.name}
      studentId={cls.student_id}
      scheduledAt={cls.scheduled_at}
      subject={cls.subject || student.subject || "Lesson"}
      initialNotes={notesRow?.content ?? ""}
      isAdmin={isAdmin}
    />
  );
}
