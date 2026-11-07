import { notFound } from "next/navigation";
import { queryOne, getSetting } from "@/lib/db";
import { ParentNav } from "@/components/parent-nav";
import type { Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParentShareLayout({
  params,
  children,
}: {
  params: { token: string };
  children: React.ReactNode;
}) {
  const shareToken = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM share_tokens WHERE token = ? AND active = 1",
    [params.token]
  );
  if (!shareToken) notFound();

  const student = await queryOne<Student>(
    "SELECT * FROM students WHERE id = ?",
    [shareToken.student_id]
  );
  if (!student) notFound();

  const businessName = (await getSetting("business_name")) || "TuitionHub";

  return (
    <>
      <ParentNav
        token={params.token}
        studentName={student.name}
        businessName={businessName}
      />
      <main className="min-h-screen bg-background md:ml-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
