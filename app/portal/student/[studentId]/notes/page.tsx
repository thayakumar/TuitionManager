import Link from "next/link";
import { TableExplorer } from "@/components/table-explorer";
import { RichText } from "@/components/rich-text";
import { ownStudentContext } from "@/lib/portal-context";
import { StickyNote } from "lucide-react";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type StudentNoteRow = {
  class_id: number;
  scheduled_at: string;
  subject: string | null;
  content: string | null;
  has_whiteboard: number;
  has_documents: number;
  updated_at: string;
};

export default async function StudentNotesPage({
  params: paramsPromise,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const params = await paramsPromise;
  const id = Number(params.studentId);

  await ownStudentContext(id);

  // Only this student's own student-scope notes — teacher notes are never selected.
  const notes = await queryAll<StudentNoteRow>(
    `SELECT c.id AS class_id, c.scheduled_at, c.subject, n.content, EXISTS(SELECT 1 FROM office_documents d JOIN office_document_grants g ON g.document_id=d.id WHERE d.class_id=c.id AND d.archived=0 AND g.student_id=c.student_id) has_documents, CASE WHEN n.updated_at IS NULL OR julianday(w.updated_at)>julianday(n.updated_at) THEN w.updated_at ELSE n.updated_at END AS updated_at, CASE WHEN w.class_id IS NOT NULL THEN 1 ELSE 0 END AS has_whiteboard
     FROM classes c
     LEFT JOIN class_notes n ON n.class_id=c.id AND n.scope='student'
     LEFT JOIN whiteboards w ON w.class_id=c.id
     WHERE c.student_id = ? AND (TRIM(COALESCE(n.content,'')) != '' OR w.class_id IS NOT NULL OR EXISTS(SELECT 1 FROM office_documents d JOIN office_document_grants g ON g.document_id=d.id WHERE d.class_id=c.id AND d.archived=0 AND g.student_id=c.student_id))
     ORDER BY c.scheduled_at DESC`,
    [id],
  );

  return (
    <>
      <PageHeader
        title="Student Notes"
        subtitle="Your notes, lesson whiteboards and shared documents"
      />

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <StickyNote
            size={36}
            className="mx-auto mb-3 text-muted-foreground/40"
          />
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Join a class meeting and use the Notes panel — your notes will
            appear here.
          </p>
        </div>
      ) : (
        <TableExplorer label="class notes">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4">Class date</th>
                <th className="p-4">Notes</th>
                <th className="p-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.class_id} className="border-b border-border/50">
                  <td className="p-4 align-top font-medium">
                    {fmtDateTime(n.scheduled_at)}
                  </td>
                  <td className="p-4 align-top">
                    <RichText content={n.content} />
                    {n.has_documents===1&&<Link href={`/meeting/${n.class_id}/documents`} target="_blank" rel="noopener noreferrer" className="mt-3 mr-4 inline-block font-medium text-primary">Open lesson documents ↗</Link>}
                    {n.has_whiteboard === 1 && (
                      <Link
                        href={`/meeting/${n.class_id}/whiteboard`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block font-medium text-primary"
                      >
                        Open lesson whiteboard ↗
                      </Link>
                    )}
                  </td>
                  <td className="p-4 align-top text-muted-foreground">
                    {fmtDateTime(n.updated_at || n.scheduled_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableExplorer>
      )}
    </>
  );
}
