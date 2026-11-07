import { notFound, redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { PortalNav } from "@/components/portal-nav";
import type { Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentPortalLayout({
  params,
  children,
}: {
  params: { studentId: string };
  children: React.ReactNode;
}) {
  const id = Number(params.studentId);

  const sessionStudentId = await getStudentSession();
  if (!sessionStudentId || sessionStudentId !== id) {
    redirect("/portal/student");
  }

  const student = await queryOne<Student>(
    `SELECT id, name, subject, grade_level, phone, email, guardian_name,
            guardian_contact, username, active, created_at
     FROM students WHERE id = ? AND active = 1`,
    [id]
  );
  if (!student) notFound();

  return (
    <>
      <PortalNav role="student" studentId={id} studentName={student.name} />
      <main className="min-h-screen bg-background md:ml-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
