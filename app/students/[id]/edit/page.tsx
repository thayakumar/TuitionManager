import { requireAdminPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserRound, UserRoundX } from "lucide-react";
import { queryOne } from "@/lib/db";
import { updateStudentQuick, deleteStudent } from "@/lib/actions";
import { LessonActionForm } from "@/components/lesson-action-form";
import { ConfirmAction } from "@/components/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/form-field";
import type { Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const id = Number((await params).id);
  const student = await queryOne<Student>(
    "SELECT * FROM students WHERE id = ?",
    [id],
  );
  if (!student) notFound();
  const update = updateStudentQuick.bind(null, id);
  const del = deleteStudent.bind(null, id);
  return (
    <>
      <Link
        href={`/students/${id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={18} /> Student profile
      </Link>
      <PageHeader
        title={`Edit ${student.name}`}
        subtitle="Keep learning information, family contacts and portal access in one place."
      />
      <LessonActionForm action={update} successPath={`/students/${id}`}>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <section className="form-section">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <UserRound size={22} />
              </span>
              <div>
                <h2 className="form-section-title">Learning profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Name, level and tuition rate
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Full name"
                  name="name"
                  required
                  defaultValue={student.name}
                />
              </div>
              <Field
                label="Grade / level"
                name="grade_level"
                defaultValue={student.grade_level ?? ""}
              />
              <Field
                label="Hourly rate"
                name="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                max="1000000"
                defaultValue={Number(student.hourly_rate)}
              />
            </div>
          </section>
          <section className="form-section">
            <div className="mb-5">
              <h2 className="form-section-title">
                Student & guardian contacts
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update the details you use to stay in touch.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Student phone"
                name="phone"
                type="tel"
                defaultValue={student.phone ?? ""}
              />
              <Field
                label="Student email"
                name="email"
                type="email"
                defaultValue={student.email ?? ""}
              />
              <Field
                label="Guardian name"
                name="guardian_name"
                defaultValue={student.guardian_name ?? ""}
              />
              <Field
                label="Guardian contact"
                name="guardian_contact"
                defaultValue={student.guardian_contact ?? ""}
              />
            </div>
          </section>
          <details className="form-section" open>
            <summary className="cursor-pointer font-semibold">
              Additional details
            </summary>
            <div className="mt-5 space-y-5">
              <Field
                label="Subject"
                name="subject"
                defaultValue={student.subject ?? ""}
              />
              <TextAreaField
                label="Private teaching notes"
                name="notes"
                rows={4}
                defaultValue={student.notes ?? ""}
              />
            </div>
          </details>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
            <Button type="button" asChild variant="outline">
              <Link href={`/students/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-6">
          <section className="form-section">
            <ShieldCheck size={26} className="mb-4 text-primary" />
            <h2 className="form-section-title">Student access</h2>
            <label
              htmlFor="student-active"
              className="mt-5 flex cursor-pointer items-start gap-3"
            >
              <input
                id="student-active"
                type="checkbox"
                name="active"
                defaultChecked={!!student.active}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span>
                <span className="block font-semibold">
                  Portal access enabled
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                  Switch off and save to revoke access immediately. Their
                  lesson, invoice and work history is preserved.
                </span>
              </span>
            </label>
          </section>
          <section className="rounded-2xl border border-destructive/20 bg-card p-6">
            <UserRoundX size={24} className="mb-3 text-destructive" />
            <h2 className="font-semibold">Leaving tuition?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Deactivate the student to end portal access while keeping their
              history.
            </p>
            {student.active ? <div className="mt-5"><ConfirmAction action={del} label="Deactivate student" message="This removes portal access immediately while preserving lesson, invoice and work history."/></div> : <p className="mt-4 text-sm text-muted-foreground">This student is already inactive.</p>}
          </section>
        </aside>
      </div>
      </LessonActionForm>
    </>
  );
}
