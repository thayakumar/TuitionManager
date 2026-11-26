import { getInitials } from "@/lib/initials";
import { StudentProfileForm } from "@/components/student-profile-form";
import { ownStudentContext } from "@/lib/portal-context";
import { notFound } from "next/navigation";
import {
  User,
  BookOpen,
  GraduationCap,
  Phone,
  Shield,
  KeyRound,
  Link2,
} from "lucide-react";
import { queryOne } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fmtDate } from "@/lib/format";
import { CopyLinkButton } from "@/components/copy-link-button";
import type { Student } from "@/lib/types";

export const dynamic = "force-dynamic";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted/50 shrink-0">
        <Icon size={16} className="text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default async function StudentProfilePage({
  params: paramsPromise,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const params = await paramsPromise;
  const id = Number(params.studentId);
  await ownStudentContext(id);
  const [student, shareTokenRow] = await Promise.all([
    queryOne<Student>(
      `SELECT id, name, subject, grade_level, phone, email, guardian_name,
              guardian_contact, username, profile_photo_url, active, created_at
       FROM students WHERE id = ? AND active = 1`,
      [id],
    ),
    queryOne<{ token: string }>(
      "SELECT token FROM share_tokens WHERE student_id = ? AND active = 1 ORDER BY id DESC LIMIT 1",
      [id],
    ),
  ]);
  if (!student) notFound();

  return (
    <>
      <PageHeader
        title="My profile"
        subtitle="Your personal information and portal login details"
      />

      {/* Profile Hero */}
      <div className="profile-identity relative rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="relative flex items-center gap-4 min-w-0">
          <div className="flex size-16 shrink-0 overflow-hidden items-center justify-center rounded-2xl bg-secondary text-primary text-3xl font-bold">
            {student.profile_photo_url ? (
              <img
                src={student.profile_photo_url}
                alt={student.name}
                className="size-full rounded-2xl object-cover"
              />
            ) : (
              getInitials(student.name, 1)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold break-words">{student.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              {student.subject && (
                <span className="flex items-center gap-1">
                  <BookOpen size={14} aria-hidden="true" /> {student.subject}
                </span>
              )}
              {student.grade_level && (
                <span className="flex items-center gap-1">
                  <GraduationCap size={14} aria-hidden="true" /> {student.grade_level}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Member since {fmtDate(student.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={16} className="text-primary" aria-hidden="true" />
              Personal information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudentProfileForm student={student} />
          </CardContent>
        </Card>

        {/* Guardian Info */}
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield size={16} className="text-emerald-700" aria-hidden="true" />
              Guardian / parent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.guardian_name || student.guardian_contact ? (
              <div className="divide-y divide-border/50">
                <InfoRow
                  icon={User}
                  label="Guardian name"
                  value={student.guardian_name}
                />
                <InfoRow
                  icon={Phone}
                  label="Guardian contact"
                  value={student.guardian_contact}
                />
              </div>
            ) : (
              <div className="text-center py-6">
                <Shield
                  size={28}
                  className="mx-auto mb-2 text-muted-foreground/30"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  No guardian information on file
                </p>
              </div>
            )}
            {shareTokenRow && (
              <>
                <Separator className="my-3" />
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                    <Link2 size={16} className="text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Parent portal link
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      Share this with your guardian
                    </p>
                  </div>
                  <CopyLinkButton
                    url={`/share/${shareTokenRow.token}`}
                    label="Copy link"
                    relative
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Login Credentials */}
      <Card className="border shadow-none mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound size={16} className="text-amber-700" aria-hidden="true" />
            Login credentials
          </CardTitle>
          <CardDescription>Your portal sign-in username</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm rounded-lg border border-border/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">Username</p>
            <p className="text-sm font-mono font-semibold text-foreground">
              {student.username || "—"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Contact your tutor if you need to change your credentials.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
