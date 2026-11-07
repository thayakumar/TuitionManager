import { notFound } from "next/navigation";
import { queryAll, queryOne } from "@/lib/db";
import { ClassroomBanner } from "@/components/classroom/classroom-banner";
import { ClassroomTabs } from "@/components/classroom/classroom-tabs";
import type { Student, Post, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentClassroomPage({
  params,
}: {
  params: { studentId: string };
}) {
  const studentId = Number(params.studentId);
  const student = await queryOne<Student>(
    "SELECT * FROM students WHERE id = ? AND active = 1",
    [studentId]
  );
  if (!student) notFound();

  const [posts, topics, submissions] = await Promise.all([
    queryAll<Post>(
      "SELECT * FROM posts WHERE student_id = ? ORDER BY created_at DESC",
      [studentId]
    ),
    queryAll<Topic>(
      "SELECT * FROM topics WHERE student_id = ? ORDER BY sort_order, name",
      [studentId]
    ),
    queryAll<{ post_id: number; grade: string | null; graded_at: string | null; submitted_at: string }>(
      `SELECT post_id, grade, graded_at, submitted_at
       FROM submissions WHERE student_id = ? ORDER BY submitted_at DESC`,
      [studentId]
    ),
  ]);

  return (
    <>
      <ClassroomBanner studentName={student.name} subject={student.subject} />

      <div className="mt-6">
        <ClassroomTabs
          studentId={studentId}
          posts={posts}
          topics={topics}
          submissions={submissions}
          isAdmin={false}
        />
      </div>
    </>
  );
}
