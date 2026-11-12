import { NextResponse } from "next/server";
import { isAdminRequest, getStudentSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { generateJaasJwt, isJaasConfigured } from "@/lib/jaas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const classId = Number(url.searchParams.get("classId") || "21");

  try {
    const isAdmin = await isAdminRequest();
    const studentId = await getStudentSession();

    const cls = await queryOne<any>(
      "SELECT id, student_id, meeting_room FROM classes WHERE id = ?",
      [classId]
    );

    const jaasOk = isJaasConfigured();

    let jwtOk = false;
    try {
      const jwt = await generateJaasJwt({
        userName: "Test",
        isModerator: false,
        userId: "test",
      });
      jwtOk = !!jwt;
    } catch (e: any) {
      return NextResponse.json({
        isAdmin, studentId, classId, cls, jaasOk,
        jwtError: e.message,
      });
    }

    return NextResponse.json({
      isAdmin,
      studentId,
      classId,
      cls: cls ? { id: cls.id, student_id: cls.student_id, meeting_room: cls.meeting_room } : null,
      studentOwnsClass: cls ? studentId === cls.student_id : null,
      jaasOk,
      jwtOk,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
