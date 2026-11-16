import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Megaphone,
  HelpCircle,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDateTime, fmtShortDate } from "@/lib/format";
import { SubmissionForm } from "@/components/classroom/submission-form";
import {
  AttemptWork,
  SubmissionHistory,
  safeSubmissionHref,
  type SubmissionAttempt,
} from "@/components/classroom/submission-history";
import type { Post, PostAttachment, Submission, Student } from "@/lib/types";

export const dynamic = "force-dynamic";
const POST_TYPE_CONFIG = {
  material: { icon: BookOpen, label: "Material" },
  assignment: { icon: ClipboardList, label: "Assignment" },
  quiz: { icon: HelpCircle, label: "Quiz" },
  announcement: { icon: Megaphone, label: "Announcement" },
};

type CurrentSubmission = Submission & { version: number };
export default async function StudentPostDetailPage({
  params,
}: {
  params: Promise<{ studentId: string; postId: string }>;
}) {
  const resolvedParams = await params;
  const studentId = Number(resolvedParams.studentId);
  const postId = Number(resolvedParams.postId);
  await requireStudent(studentId);
  if (!Number.isSafeInteger(postId) || postId <= 0) notFound();
  const [student, post] = await Promise.all([
    queryOne<Pick<Student, "id" | "name">>(
      "SELECT id, name FROM students WHERE id = ? AND active = 1",
      [studentId],
    ),
    queryOne<Post>(
      "SELECT id, type, title, body, student_id, due_at, topic_id, max_points, created_at, updated_at FROM posts WHERE id = ? AND student_id = ?",
      [postId, studentId],
    ),
  ]);
  if (!student || !post) notFound();
  const [attachments, submission] = await Promise.all([
    queryAll<PostAttachment>(
      "SELECT id, post_id, file_name, file_url, file_type FROM post_attachments WHERE post_id = ? ORDER BY id",
      [postId],
    ),
    post.type === "assignment"
      ? queryOne<CurrentSubmission>(
          "SELECT id, post_id, student_id, content, file_url, grade, feedback, submitted_at, graded_at, version FROM submissions WHERE post_id = ? AND student_id = ?",
          [postId, studentId],
        )
      : Promise.resolve(undefined),
  ]);
  const attempts = submission
    ? await queryAll<SubmissionAttempt>(
        "SELECT version, content, file_url, grade, feedback, submitted_at, graded_at, max_points FROM submission_versions WHERE submission_id = ? ORDER BY version DESC",
        [submission.id],
      )
    : [];
  const config = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG.material;
  const Icon = config.icon;
  return (
    <div className="space-y-5">
      <Link href={`/portal/student/${studentId}/classroom`}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft size={14} />
          My Class
        </Button>
      </Link>
      <div className={post.type === "assignment" ? "classroom-assignment-layout" : ""}>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary">{config.label}</p>
              <h1 className="break-words text-3xl font-medium text-primary">
                {post.title}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Tutor · {fmtShortDate(post.created_at)}
                {post.updated_at
                  ? ` · Edited ${fmtShortDate(post.updated_at)}`
                  : ""}
              </p>
            </div>
          </div>
          {post.type === "assignment" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {post.max_points !== null && (
                <Badge variant="outline">{post.max_points} points</Badge>
              )}
              {post.due_at && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={12} />
                  Due {fmtDateTime(post.due_at)}
                </span>
              )}
              <SubmissionStatus submission={submission} dueAt={post.due_at} />
            </div>
          )}
          <Separator className="my-4" />
          {post.body ? (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {post.body}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No additional instructions.
            </p>
          )}
          {attachments.length > 0 && (
            <div className="mt-5 space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Attachments
              </h2>
              {attachments.map((attachment) => {
                const href = safeSubmissionHref(attachment.file_url);
                return href ? (
                  <a
                    key={attachment.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border p-3 text-sm hover:bg-muted/40"
                  >
                    <FileText size={17} className="shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 break-words">
                      {attachment.file_name}
                    </span>
                    <ExternalLink size={14} className="shrink-0" />
                  </a>
                ) : (
                  <p
                    key={attachment.id}
                    className="text-sm text-muted-foreground"
                  >
                    {attachment.file_name}: attachment unavailable.
                  </p>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {post.type === "assignment" && (
        <Card>
          <CardContent className="space-y-5 p-5 sm:p-6">
            <h2 className="font-semibold">Your work</h2>
            {submission ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">
                    Latest attempt · {submission.version}
                  </h3>
                  <Badge
                    variant={submission.graded_at ? "default" : "secondary"}
                  >
                    {submission.graded_at ? "Graded" : "Awaiting grading"}
                  </Badge>
                </div>
                <AttemptWork attempt={submission} maxPoints={post.max_points} />
                <details className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">
                    Submit a new attempt
                  </summary>
                  <div className="mt-4">
                    <SubmissionForm
                      postId={postId}
                      studentId={studentId}
                      studentName={student.name}
                      resubmission
                    />
                  </div>
                </details>
                <SubmissionHistory
                  attempts={attempts}
                  latestVersion={submission.version}
                  maxPoints={post.max_points}
                />
              </>
            ) : (
              <SubmissionForm
                postId={postId}
                studentId={studentId}
                studentName={student.name}
              />
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
function SubmissionStatus({
  submission,
  dueAt,
}: {
  submission: CurrentSubmission | undefined;
  dueAt: string | null;
}) {
  if (submission?.graded_at) return <Badge>Graded</Badge>;
  if (submission) return <Badge variant="secondary">Awaiting grading</Badge>;
  if (dueAt && Date.parse(dueAt) < Date.now())
    return <Badge variant="destructive">Missing</Badge>;
  return <Badge variant="outline">Assigned</Badge>;
}
