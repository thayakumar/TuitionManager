import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { queryOne, getSetting } from "@/lib/db";
import { MeetingRoom } from "@/components/meeting-room";
import type { ClassRow, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: { classId: string } }) {
  const classId = Number(params.classId);
  const cls = await queryOne<ClassRow>("SELECT * FROM classes WHERE id = ?", [classId]);
  if (!cls || !cls.meeting_room) notFound();

  const student = await queryOne<Student>("SELECT * FROM students WHERE id = ?", [cls.student_id]);
  if (!student) notFound();

  const cookieStore = cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  let isAdmin = false;
  if (sessionToken) {
    const stored = await getSetting("admin_session_token");
    isAdmin = !!stored && stored === sessionToken;
  }

  return (
    <MeetingRoom
      classId={classId}
      roomName={cls.meeting_room}
      studentName={student.name}
      scheduledAt={cls.scheduled_at}
      subject={cls.subject || student.subject || "Lesson"}
      initialNotes={isAdmin ? (cls.meeting_notes || "") : ""}
      isAdmin={isAdmin}
    />
  );
}
