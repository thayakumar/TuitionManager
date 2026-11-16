import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, UserPlus } from "lucide-react";
import { createStudent } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/form-field";
import { LessonActionForm } from "@/components/lesson-action-form";

export default async function NewStudentPage() {
  await requireAdminPage();
  return (
    <>
      <Link
        href="/students"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={18} /> All students
      </Link>
      <PageHeader
        title="Welcome a new student"
        subtitle="Start with their learning profile. Contact details and extra notes can be added whenever you need them."
      />
      <LessonActionForm action={createStudent}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <section className="form-section">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <UserPlus size={22} />
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
                    placeholder="Student’s full name"
                  />
                </div>
                <Field
                  label="Grade / level"
                  name="grade_level"
                  placeholder="e.g. Form 4"
                />
                <Field
                  label="Hourly rate"
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000000"
                  defaultValue={0}
                />
              </div>
            </section>
            <section className="form-section">
              <div className="mb-5">
                <h2 className="form-section-title">Contact details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Optional student and guardian contacts
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Student phone" name="phone" type="tel" />
                <Field label="Student email" name="email" type="email" />
                <Field label="Guardian name" name="guardian_name" />
                <Field label="Guardian contact" name="guardian_contact" />
              </div>
            </section>
            <details className="form-section">
              <summary className="cursor-pointer font-semibold">
                Additional details{" "}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  Optional
                </span>
              </summary>
              <div className="mt-5 space-y-5">
                <Field
                  label="Subject"
                  name="subject"
                  placeholder="e.g. Mathematics"
                />
                <TextAreaField
                  label="Private teaching notes"
                  name="notes"
                  rows={4}
                  placeholder="Learning goals, preferences and helpful context"
                />
              </div>
            </details>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
              <Button asChild type="button" variant="outline">
                <Link href="/students">Cancel</Link>
              </Button>
              <Button type="submit">
                <UserPlus size={18} /> Create student
              </Button>
            </div>
          </div>
          <aside className="rounded-2xl border border-primary/15 bg-secondary p-6 xl:sticky xl:top-6">
            <KeyRound size={26} className="mb-4 text-primary" />
            <h2 className="text-lg font-semibold">
              Their learning space is next
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Login details are created automatically from the student’s first
              name. A number is added if that username is already taken.
            </p>
            <div className="mt-6 flex items-start gap-3 border-t border-primary/15 pt-5">
              <CheckCircle2 size={19} className="mt-1 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed">
                After saving, open the profile to copy the exact login details
                or schedule their first lesson.
              </p>
            </div>
          </aside>
        </div>
      </LessonActionForm>
    </>
  );
}
