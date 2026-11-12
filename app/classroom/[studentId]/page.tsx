import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ClassroomBanner } from "@/components/classroom/classroom-banner";
import { ClassroomTabs } from "@/components/classroom/classroom-tabs";
import { ClassroomActions } from "@/components/classroom-post-dialog";
import type { Student, Post, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentClassroomPage({ params }: { params: { studentId: string } }) {
  const studentId = Number(params.studentId);
  const student = await queryOne<Student>(
    "SELECT id, name, subject, grade_level, phone, email, guardian_name, guardian_contact, active, created_at FROM students WHERE id = ? AND active = 1",
    [studentId]
  );
  if (!student) notFound();

  const [posts, topics, submissions] = await Promise.all([
    queryAll<Post>(
      "SELECT id, type, title, body, student_id, due_at, topic_id, max_points, created_at, updated_at FROM posts WHERE student_id = ? ORDER BY created_at DESC",
      [studentId]
    ),
    queryAll<Topic>(
      "SELECT id, student_id, name, sort_order FROM topics WHERE student_id = ? ORDER BY sort_order, name",
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
      <div className="flex items-center justify-between mb-4">
        <Link href="/classroom">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft size={14} />
            All Classrooms
          </Button>
        </Link>
        <ClassroomActions studentId={studentId} topics={topics} />
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
