import Link from "next/link";
import { BookOpen, Users, FileText, ClipboardList, Megaphone } from "lucide-react";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

type StudentClassroom = {
  id: number;
  name: string;
  subject: string | null;
  post_count: number;
};

export default async function ClassroomPage() {
  const students = await queryAll<StudentClassroom>(
    `SELECT
       s.id, s.name, s.subject,
       (SELECT COUNT(*) FROM posts p WHERE p.student_id = s.id) as post_count
     FROM students s
     WHERE s.active = 1
     ORDER BY s.name`
  );

  return (
    <>
      <PageHeader
        title="Classroom"
        subtitle="Each student has their own classroom space"
      />

      {students.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="p-12 text-center">
            <Users size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No students yet</h3>
            <p className="text-sm text-muted-foreground">
              Add students to create their classroom spaces.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const initials = student.name
              .split(/\s+/)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Link key={student.id} href={`/classroom/${student.id}`}>
                <Card className="shadow-sm border-0 hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11 bg-indigo-100 text-indigo-600 shrink-0">
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-indigo-600 transition-colors truncate">
                          {student.name}
                        </h3>
                        {student.subject && (
                          <p className="text-xs text-muted-foreground truncate">{student.subject}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {student.post_count > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <BookOpen size={12} />
                              {student.post_count} post{student.post_count !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No posts yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
