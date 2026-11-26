import { getInitials } from "@/lib/initials";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
        <Card>
          <CardContent className="p-12 text-center">
            <Users
              size={48}
              className="mx-auto mb-4 text-muted-foreground/30"
              aria-hidden="true"
            />
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              No students yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Add students to create their classroom spaces.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/students">Go to students</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student, index) => (
            <Link
              key={student.id}
              href={`/classroom/${student.id}`}
              className="classroom-home-card group"
            >
              <div className={`classroom-home-cover classroom-cover-${index % 3}`}>
                <h2 className="break-words text-2xl font-semibold leading-snug">
                  {student.name}
                </h2>
                <p className="mt-2 text-base text-white/85">
                  {student.subject || "Learning together"}
                </p>
                <BookOpen
                  className="absolute bottom-5 right-6 size-16 text-white/20 transition-transform duration-200 ease-out group-hover:scale-105"
                  aria-hidden="true"
                />
              </div>
              <div className="relative min-h-28 px-6 pb-6 pt-10">
                <div className="classroom-home-avatar" aria-hidden="true">
                  {getInitials(student.name)}
                </div>
                <p className="text-sm font-medium text-muted-foreground tabular-nums">
                  {student.post_count} classroom{" "}
                  {student.post_count === 1 ? "post" : "posts"}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm font-semibold text-primary">
                <span>Open classroom</span>
                <ArrowRight
                  size={18}
                  className="transition-transform duration-150 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
