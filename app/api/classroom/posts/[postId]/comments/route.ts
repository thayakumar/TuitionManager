import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";
import { classroomAccess, ClassroomAccessError } from "@/lib/classroom-access";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const id = Number((await params).postId),
      actor = await classroomAccess(
        id,
        false,
        new URL(request.url).searchParams.get("viewer") === "student",
      );
    const raw = new URL(request.url).searchParams.get("before"),
      before = raw ? Number(raw) : Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(before) || before < 1)
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    const rows = await queryAll<{
      id: number;
      author_role: string;
      author_student_id: number | null;
      body: string;
      created_at: string;
      updated_at: string;
      student_name: string | null;
      profile_photo_url: string | null;
    }>(
      "SELECT c.id,c.author_role,c.author_student_id,c.body,c.created_at,c.updated_at,s.name AS student_name,s.profile_photo_url FROM post_comments c LEFT JOIN students s ON s.id=c.author_student_id WHERE c.post_id=? AND c.id<? ORDER BY c.id DESC LIMIT 51",
      [id, before],
    );
    return NextResponse.json(
      {
        comments: rows
          .slice(0, 50)
          .reverse()
          .map((c) => ({
            ...c,
            authorName:
              c.author_role === "admin" ? "Tutor" : c.student_name || "Student",
            isOwn: actor.admin
              ? c.author_role === "admin"
              : c.author_role === "student" &&
                c.author_student_id === actor.studentId,
            canEdit: actor.admin
              ? c.author_role === "admin"
              : c.author_role === "student" &&
                c.author_student_id === actor.studentId,
            canDelete:
              actor.admin ||
              (c.author_role === "student" &&
                c.author_student_id === actor.studentId),
          })),
        hasMore: rows.length > 50,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ClassroomAccessError
            ? error.message
            : "Could not load comments",
      },
      { status: error instanceof ClassroomAccessError ? error.status : 500 },
    );
  }
}
