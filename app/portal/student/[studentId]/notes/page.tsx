import { notFound } from "next/navigation";
import { CalendarDays, StickyNote } from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import type { Student } from "@/lib/types";

export const dynamic = "force-dynamic";

type StudentNoteRow = {
  class_id: number;
  scheduled_at: string;
  subject: string | null;
  content: string;
  updated_at: string;
};

export default async function StudentNotesPage({
  params,
}: {
  params: { studentId: string };
}) {
  const id = Number(params.studentId);

  const student = await queryOne<Student>(
    `SELECT id, name, subject, grade_level, phone, email, guardian_name,
            guardian_contact, username, active, created_at
     FROM students WHERE id = ? AND active = 1`,
    [id]
  );
  if (!student) notFound();

  // Only this student's own student-scope notes — teacher notes are never selected.
  const notes = await queryAll<StudentNoteRow>(
    `SELECT c.id AS class_id, c.scheduled_at, c.subject, n.content, n.updated_at
     FROM class_notes n
     JOIN classes c ON c.id = n.class_id
     WHERE c.student_id = ? AND n.scope = 'student' AND TRIM(n.content) != ''
     ORDER BY c.scheduled_at DESC`,
    [id]
  );

  return (
    <>
      <PageHeader
        title="Student Notes"
        subtitle="Your private notes, one per class meeting"
      />

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <StickyNote size={36} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Join a class meeting and use the Notes panel — your notes will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((n) => (
            <Card key={n.class_id} className="shadow-sm border-0">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CalendarDays size={15} className="text-indigo-500" />
                    {fmtDateTime(n.scheduled_at)}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {n.subject || student.subject || "Lesson"}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{n.content}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Last updated {fmtDateTime(n.updated_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
