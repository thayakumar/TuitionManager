import { getInitials } from "@/lib/initials";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type StudentClassroom = {
  id: number;
  name: string;
  subject: string | null;
  post_count: number;
};

export default async function ClassroomPage() {
  await requireAdminPage();
  const students = await queryAll<StudentClassroom>(
    `SELECT
       s.id, s.name, s.subject,
       (SELECT COUNT(*) FROM posts p WHERE p.student_id = s.id) as post_count
     FROM students s
     WHERE s.active = 1
     ORDER BY s.name`,
  );

  return (
    <>
      <PageHeader
        title="Classroom"
        subtitle="Each student has their own classroom space"
      />

      {students.length === 0 ? (
        <Card className="border shadow-none">
          <CardContent className="p-12 text-center">
            <Users
              size={48}
              className="mx-auto mb-4 text-muted-foreground/30"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              No students yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Add students to create their classroom spaces.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student, index) => (
            <Link
              key={student.id}
              href={`/classroom/${student.id}`}
              className="classroom-home-card"
            >
              <div className={`classroom-home-cover classroom-cover-${index % 3}`}>
                <h2 className="break-words text-2xl font-semibold leading-snug">
                  {student.name}
                </h2>
                <p className="mt-2 text-base text-white/85">
                  {student.subject || "Learning together"}
                </p>
                <BookOpen
                  className="absolute bottom-5 right-6 size-16 text-white/20"
                  aria-hidden="true"
                />
              </div>
              <div className="relative min-h-28 px-6 pb-6 pt-10">
                <div className="classroom-home-avatar" aria-hidden="true">
                  {getInitials(student.name)}
                </div>
                <p className="text-base text-muted-foreground">
                  {student.post_count} classroom{" "}
                  {student.post_count === 1 ? "post" : "posts"}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border px-6 py-4 font-medium text-primary">
                Open classroom <BookOpen size={21} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
