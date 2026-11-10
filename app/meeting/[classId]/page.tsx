import { notFound, redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getStudentSession, isAdminRequest } from "@/lib/auth";
import { MeetingRoom } from "@/components/meeting-room";
import type { ClassRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: { classId: string } }) {
  const classId = Number(params.classId);

  const isAdmin = await isAdminRequest();
  const sessionStudentId = isAdmin ? null : await getStudentSession();

  // Admins get every column; students get an explicit list that omits
  // meeting_notes so tutor notes never enter their RSC payload.
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

  // A student may only join their own class meeting.
  if (!isAdmin && sessionStudentId !== Number(cls.student_id)) {
    redirect("/portal/student");
  }

  const student = await queryOne<{ id: number; name: string; subject: string | null }>(
    "SELECT id, name, subject FROM students WHERE id = ?",
    [cls.student_id]
  );
  if (!student) notFound();

  const note = await queryOne<{ content: string }>(
    "SELECT content FROM class_notes WHERE class_id = ? AND scope = ?",
    [classId, isAdmin ? "teacher" : "student"]
  );

  return (
    <MeetingRoom
      classId={classId}
      roomName={cls.meeting_room}
      studentName={student.name}
      studentId={cls.student_id}
      scheduledAt={cls.scheduled_at}
      subject={cls.subject || student.subject || "Lesson"}
      initialNotes={note?.content || ""}
      isAdmin={isAdmin}
    />
  );
}
