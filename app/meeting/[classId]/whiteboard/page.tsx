import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { verifyAdminSession, getStudentSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { WhiteboardCanvas } from "@/components/whiteboard-canvas";
export const dynamic = "force-dynamic";
export default async function LessonWhiteboard({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const id = Number((await params).classId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const admin = await verifyAdminSession(),
    studentId = admin ? null : await getStudentSession();
  if (!admin && !studentId) redirect("/portal/student");
  const lesson = await queryOne<{
    student_id: number;
    name: string;
    scheduled_at: string;
  }>(
    "SELECT c.student_id,s.name,c.scheduled_at FROM classes c JOIN students s ON s.id=c.student_id WHERE c.id=? AND (?=1 OR (c.student_id=? AND s.active=1))",
    [id, admin ? 1 : 0, studentId ?? 0],
  );
  if (!lesson) notFound();
  return (
    <WhiteboardCanvas
      boardId={"class-" + id}
      identity={admin ? "admin" : "student-" + studentId}
      details={
        <div className="space-y-3">
          <h1 className="text-lg font-bold">Lesson whiteboard</h1>
          <p className="text-sm text-muted-foreground">
            {lesson.name} · {fmtDateTime(lesson.scheduled_at)}
          </p>
          <nav className="flex flex-wrap gap-3 text-sm font-medium text-primary">
            <Link
              href={
                admin
                  ? "/classes/" + id
                  : "/portal/student/" + lesson.student_id + "/notes"
              }
            >
              Class notes
            </Link>
            {admin && (
              <Link
                href="/whiteboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                All whiteboards
              </Link>
            )}
          </nav>
        </div>
      }
    />
  );
}
