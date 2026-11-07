import { notFound } from "next/navigation";
import {
  User, BookOpen, GraduationCap, Mail, Phone, Shield,
  KeyRound, Calendar, UserCircle,
} from "lucide-react";
import { queryOne } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDate } from "@/lib/format";
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
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default async function StudentProfilePage({
  params,
}: {
  params: { studentId: string };
}) {
  const id = Number(params.studentId);
  const student = await queryOne<Student>(
    "SELECT * FROM students WHERE id = ? AND active = 1",
    [id]
  );
  if (!student) notFound();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <UserCircle size={22} className="text-indigo-500" />
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your personal information
        </p>
      </div>

      {/* Profile Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg mb-6">
        <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-0 size-20 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-white/80">
              {student.subject && (
                <span className="flex items-center gap-1">
                  <BookOpen size={14} /> {student.subject}
                </span>
              )}
              {student.grade_level && (
                <span className="flex items-center gap-1">
                  <GraduationCap size={14} /> {student.grade_level}
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-1">
              Member since {fmtDate(student.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={16} className="text-indigo-500" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              <InfoRow icon={User} label="Full Name" value={student.name} />
              <InfoRow icon={BookOpen} label="Subject" value={student.subject} />
              <InfoRow icon={GraduationCap} label="Grade / Level" value={student.grade_level} />
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={student.phone} />
            </div>
            {!student.email && !student.phone && !student.grade_level && (
              <p className="text-sm text-muted-foreground py-3">No additional details on file.</p>
            )}
          </CardContent>
        </Card>

        {/* Guardian Info */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield size={16} className="text-emerald-500" />
              Guardian / Parent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.guardian_name || student.guardian_contact ? (
              <div className="divide-y divide-border/50">
                <InfoRow icon={User} label="Guardian Name" value={student.guardian_name} />
                <InfoRow icon={Phone} label="Guardian Contact" value={student.guardian_contact} />
              </div>
            ) : (
              <div className="text-center py-6">
                <Shield size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No guardian information on file</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Login Credentials */}
      <Card className="shadow-sm border-0 mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound size={16} className="text-amber-500" />
            Login Credentials
          </CardTitle>
          <CardDescription>Your portal login details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-xs text-muted-foreground mb-1">Username</p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {student.username || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-xs text-muted-foreground mb-1">Password</p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {student.password || "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Contact your tutor if you need to change your credentials.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
