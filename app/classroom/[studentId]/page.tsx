import { requireAdminPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ClassroomBanner } from "@/components/classroom/classroom-banner";
import { ClassroomTabs } from "@/components/classroom/classroom-tabs";
import type { Student, Post, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentClassroomPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireAdminPage();
  const resolvedParams = await params;
  const studentId = Number(resolvedParams.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) notFound();
  const student = await queryOne<Student>(
    "SELECT id, name, subject, grade_level, phone, email, guardian_name, guardian_contact, active, created_at FROM students WHERE id = ? AND active = 1",
    [studentId],
  );
  if (!student) notFound();

  const [posts, topics, submissions] = await Promise.all([
    queryAll<Post>(
      "SELECT id, type, title, body, student_id, due_at, topic_id, max_points, created_at, updated_at, sort_order FROM posts WHERE student_id = ? ORDER BY julianday(created_at) DESC, id DESC",
      [studentId],
    ),
    queryAll<Topic>(
      "SELECT id, student_id, name, sort_order FROM topics WHERE student_id = ? ORDER BY sort_order, name",
      [studentId],
    ),
    queryAll<{
      post_id: number;
      max_points: number | null;
      grade: string | null;
      graded_at: string | null;
      submitted_at: string;
    }>(
      `SELECT s.post_id, s.grade, s.graded_at, s.submitted_at, v.max_points
       FROM submissions s LEFT JOIN submission_versions v ON v.submission_id=s.id AND v.version=s.version
       WHERE s.student_id = ? ORDER BY s.submitted_at DESC`,
      [studentId],
    ),
  ]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <Link href="/classroom">
            <ArrowLeft size={14} aria-hidden="true" />
            All classrooms
          </Link>
        </Button>
      </div>

      <ClassroomBanner studentName={student.name} subject={student.subject} />

      <div className="mt-6">
        <ClassroomTabs
          studentId={studentId}
          posts={posts}
          topics={topics}
          submissions={submissions}
          isAdmin
        />
      </div>
    </>
  );
}
