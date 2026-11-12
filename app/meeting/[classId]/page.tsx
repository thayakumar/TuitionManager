import { notFound, redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { isAdminRequest, getStudentSession } from "@/lib/auth";
import { generateJaasJwt, jaasRoomName } from "@/lib/jaas";
import { MeetingRoom } from "@/components/meeting-room";
import type { ClassRow, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: { classId: string } }) {
  const classId = Number(params.classId);

  const isAdmin = await isAdminRequest();
  const studentIdFromSession = isAdmin ? null : await getStudentSession();

  if (!isAdmin && !studentIdFromSession) {
    redirect("/portal/student");
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

  if (!isAdmin && studentIdFromSession !== cls.student_id) {
    redirect("/portal/student");
  }

  const student = await queryOne<Student>(
    isAdmin
      ? "SELECT * FROM students WHERE id = ?"
      : `SELECT id, name, subject, grade_level, phone, email, guardian_name,
                guardian_phone, guardian_email, active, created_at, username
         FROM students WHERE id = ?`,
    [cls.student_id]
  );
  if (!student) notFound();

  const scope = isAdmin ? "teacher" : "student";
  const notesRow = await queryOne<{ content: string }>(
    "SELECT content FROM class_notes WHERE class_id = ? AND scope = ?",
    [classId, scope]
  );

  const displayName = isAdmin ? "Tutor" : student.name;
  const jwt = await generateJaasJwt({
    roomName: cls.meeting_room,
    userName: displayName,
    isModerator: isAdmin,
    userId: isAdmin ? "admin" : `student-${cls.student_id}`,
    email: isAdmin ? undefined : (student.email || undefined),
  });

  return (
    <MeetingRoom
      classId={classId}
      roomName={jaasRoomName(cls.meeting_room)}
      studentName={student.name}
      studentId={cls.student_id}
      scheduledAt={cls.scheduled_at}
      subject={cls.subject || student.subject || "Lesson"}
      initialNotes={notesRow?.content ?? ""}
      isAdmin={isAdmin}
      jwt={jwt}
    />
  );
}
