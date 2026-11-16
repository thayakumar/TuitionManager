import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { queryAll, queryOne, getSetting } from "@/lib/db";
import { deleteStudentNote } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { LessonStatusBadge } from "@/components/lesson-status-badge";
import { ReportRow } from "@/components/report-row";
import { NotesTable } from "@/components/notes-table";
import { Button } from "@/components/ui/button";
import { currency, fmtDateTime } from "@/lib/format";
import type { ClassRow, Invoice, Report, StudentNote } from "@/lib/types";
export const dynamic = "force-dynamic";
const sections = [
  ["classes", "Past lessons"],
  ["upcoming", "Upcoming lessons"],
  ["invoices", "Invoices"],
  ["reports", "Reports"],
  ["notes", "Class notes"],
  ["running-notes", "Running notes"],
] as const;
type ReportRecord = Report & { scheduled_at: string; subject: string | null };
export default async function StudentHistory({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string; page?: string }>;
}) {
  await requireAdminPage();
  const route = await params,
    search = await searchParams,
    id = Number(route.id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const student = await queryOne<{
    id: number;
    name: string;
    subject: string | null;
  }>("SELECT id,name,subject FROM students WHERE id=?", [id]);
  if (!student) notFound();
  const section = sections.some((s) => s[0] === search.section)
      ? search.section!
      : "classes",
    page = Math.min(
      10000,
      Math.max(1, Number.parseInt(search.page || "1", 10) || 1),
    ),
    offset = (page - 1) * 20,
    now = new Date().toISOString();
  let data: unknown[] = [];
  if (section === "classes" || section === "upcoming")
    data = await queryAll<ClassRow>(
      `SELECT * FROM classes WHERE student_id=? AND ${section === "upcoming" ? "status='scheduled' AND julianday(scheduled_at)>=julianday(?)" : "julianday(scheduled_at)<=julianday(?)"} ORDER BY julianday(scheduled_at) ${section === "upcoming" ? "ASC" : "DESC"},id DESC LIMIT 21 OFFSET ?`,
      [id, now, offset],
    );
  else if (section === "invoices")
    data = await queryAll<Invoice>(
      "SELECT * FROM invoices WHERE student_id=? ORDER BY issued_at DESC,id DESC LIMIT 21 OFFSET ?",
      [id, offset],
    );
  else if (section === "reports")
    data = await queryAll<ReportRecord>(
      "SELECT r.*,c.scheduled_at,c.subject FROM reports r JOIN classes c ON c.id=r.class_id WHERE c.student_id=? ORDER BY julianday(c.scheduled_at) DESC,r.id DESC LIMIT 21 OFFSET ?",
      [id, offset],
    );
  else if (section === "notes")
    data = await queryAll(
      "SELECT c.id,c.scheduled_at,cn.content FROM classes c JOIN class_notes cn ON cn.class_id=c.id AND cn.scope='teacher' WHERE c.student_id=? AND trim(cn.content)<>'' ORDER BY julianday(c.scheduled_at) DESC,c.id DESC LIMIT 21 OFFSET ?",
      [id, offset],
    );
  else
    data = await queryAll<StudentNote>(
      "SELECT * FROM student_notes WHERE student_id=? ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET ?",
      [id, offset],
    );
  const more = data.length > 20,
    visible = data.slice(0, 20),
    symbol = section === "invoices" ? await getSetting("currency") : "RM",
    href = (next: number) =>
      `/students/${id}/history?section=${section}&page=${next}`;
  return (
    <>
      <PageHeader
        title={`${student.name} · ${sections.find((s) => s[0] === section)?.[1]}`}
        subtitle="Full records · 20 per page"
        action={
          <Button asChild variant="outline">
            <Link href={`/students/${id}`}>Back to overview</Link>
          </Button>
        }
      />
      <nav
        aria-label="Student record sections"
        className="mb-6 flex flex-wrap gap-2"
      >
        {sections.map(([key, label]) => (
          <Link
            key={key}
            href={`/students/${id}/history?section=${key}`}
            aria-current={section === key ? "page" : undefined}
            className={`rounded-full border px-4 py-2 font-medium ${section === key ? "border-primary bg-secondary text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!visible.length ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          No records on this page.
        </p>
      ) : section === "classes" || section === "upcoming" ? (
        <div className="space-y-3">
          {(visible as ClassRow[]).map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5"
            >
              <div>
                <strong>{fmtDateTime(c.scheduled_at)}</strong>
                <p className="mt-1 text-muted-foreground">
                  {c.duration_minutes} minutes{c.is_trial ? " · Trial" : ""}
                </p>
              </div>
              <LessonStatusBadge status={c.status} attendance={c.attendance} />
            </Link>
          ))}
        </div>
      ) : section === "invoices" ? (
        <div className="space-y-3">
          {(visible as Invoice[]).map((i) => (
            <Link
              key={i.id}
              href={`/invoices/${i.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5"
            >
              <div>
                <strong>{i.invoice_number}</strong>
                <p className="mt-1 capitalize text-muted-foreground">
                  {i.status}
                </p>
              </div>
              <strong>{currency(Number(i.total_amount), symbol)}</strong>
            </Link>
          ))}
        </div>
      ) : section === "reports" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-4">Lesson</th>
                <th className="p-4">Topics</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Report</th>
              </tr>
            </thead>
            <tbody>
              {(visible as ReportRecord[]).map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  defaultSubject={student.subject || "Lesson"}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : section === "notes" ? (
        <div className="space-y-4">
          {(
            visible as { id: number; scheduled_at: string; content: string }[]
          ).map((n) => (
            <article
              key={n.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <Link
                href={`/classes/${n.id}`}
                className="font-semibold text-primary"
              >
                {fmtDateTime(n.scheduled_at)}
              </Link>
              <p className="mt-3 whitespace-pre-wrap break-words">
                {n.content}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <NotesTable
          notes={visible as StudentNote[]}
          studentId={id}
          deleteAction={deleteStudentNote}
        />
      )}
      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Button asChild variant="outline">
              <Link href={href(page - 1)}>Previous</Link>
            </Button>
          )}
          {more && (
            <Button asChild variant="outline">
              <Link href={href(page + 1)}>Next</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
