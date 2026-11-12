import { NextResponse } from "next/server";
import { isAdminRequest, getStudentSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { generateJaasJwt, jaasRoomName, isJaasConfigured } from "@/lib/jaas";
import type { ClassRow, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const classId = Number(url.searchParams.get("classId") || "21");

  try {
    const isAdmin = await isAdminRequest();
    const studentIdFromSession = isAdmin ? null : await getStudentSession();

    if (!isAdmin && !studentIdFromSession) {
      return NextResponse.json({ error: "no session", isAdmin, studentIdFromSession });
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
    if (!cls || !cls.meeting_room) {
      return NextResponse.json({ error: "class not found or no meeting room", classId });
    }

    if (!isAdmin && studentIdFromSession !== cls.student_id) {
      return NextResponse.json({ error: "student doesn't own class", studentIdFromSession, classStudentId: cls.student_id });
    }

    const student = await queryOne<Student>(
      isAdmin
        ? "SELECT * FROM students WHERE id = ?"
        : `SELECT id, name, subject, grade_level, phone, email, guardian_name,
                  guardian_contact, active, created_at, username
           FROM students WHERE id = ?`,
      [cls.student_id]
    );
    if (!student) {
      return NextResponse.json({ error: "student not found", studentId: cls.student_id });
    }

    const scope = isAdmin ? "teacher" : "student";
    const notesRow = await queryOne<{ content: string }>(
      "SELECT content FROM class_notes WHERE class_id = ? AND scope = ?",
      [classId, scope]
    );

    const displayName = isAdmin ? "Tutor" : student.name;
    const jwt = await generateJaasJwt({
      userName: displayName,
      isModerator: isAdmin,
      userId: isAdmin ? "admin" : `student-${cls.student_id}`,
      email: isAdmin ? undefined : (student.email || undefined),
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      studentIdFromSession,
      classId,
      roomName: jaasRoomName(cls.meeting_room),
      studentName: student.name,
      scheduledAt: cls.scheduled_at,
      subject: cls.subject || student.subject || "Lesson",
      notesFound: !!notesRow,
      jwtGenerated: !!jwt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
