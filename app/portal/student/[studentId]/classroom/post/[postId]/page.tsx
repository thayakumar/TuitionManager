import { AttachmentCard } from "@/components/attachment-preview";
import { PostComments } from "@/components/post-comments";
import {
  AssignmentStatus,
  assignmentState,
} from "@/components/classroom/assignment-status";
import { RichText } from "@/components/rich-text";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Megaphone,
  HelpCircle,
  Calendar,
} from "lucide-react";
import { queryOne } from "@/lib/db";
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
} from "@/components/classroom/submission-history";
import { loadPostWork } from "@/lib/submitted-work";
import type { CurrentSubmission, Student } from "@/lib/types";

export const dynamic = "force-dynamic";
const POST_TYPE_CONFIG = {
  material: { icon: BookOpen, label: "Material" },
  assignment: { icon: ClipboardList, label: "Assignment" },
  quiz: { icon: HelpCircle, label: "Quiz" },
  announcement: { icon: Megaphone, label: "Announcement" },
};

export default async function StudentPostDetailPage({
  params,
}: {
  params: Promise<{ studentId: string; postId: string }>;
}) {
  const resolvedParams = await params;
  const studentId = Number(resolvedParams.studentId);
  const postId = Number(resolvedParams.postId);
  await requireStudent(studentId);
  const [student, work] = await Promise.all([
    queryOne<Pick<Student, "id" | "name">>(
      "SELECT id, name FROM students WHERE id = ? AND active = 1",
      [studentId],
    ),
    loadPostWork(studentId, postId),
  ]);
  if (!student || !work) notFound();
  const { post, attachments, submission, attempts, acceptsWork } = work;
  const config = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG.material;
  const Icon = config.icon;
  return (
    <div className="space-y-5">
      <Link href={`/portal/student/${studentId}/classroom`}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft size={14} />
          My Classroom
        </Button>
      </Link>
      <div className="space-y-6 min-w-0">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary">
                  {config.label}
                </p>
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
            {acceptsWork && (
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
              <RichText
                content={post.body}
                className="whitespace-pre-wrap break-words text-sm leading-relaxed"
              />
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
                {attachments.map((attachment) => (
                  <AttachmentCard
                    key={attachment.id}
                    fileUrl={attachment.file_url}
                    fileName={attachment.file_name}
                    fileType={attachment.file_type}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {acceptsWork && (
          <>
            <Card data-testid="submitted-work" className="min-w-0">
              <CardContent className="space-y-5 p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Submitted work</h2>
                  <AssignmentStatus
                    status={assignmentState(submission, post.due_at)}
                  />
                </div>
                {submission ? (
                  <>
                    <h3 className="font-medium">
                      Latest attempt · {submission.version}
                    </h3>
                    <AttemptWork
                      attempt={submission}
                      maxPoints={post.max_points}
                    />
                    <SubmissionHistory
                      attempts={attempts}
                      latestVersion={submission.version}
                      maxPoints={post.max_points}
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    You haven’t submitted work for this assignment yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card data-testid="submit-work" className="min-w-0">
              <CardContent className="space-y-5 p-5 sm:p-7">
                <h2 className="text-xl font-semibold">
                  {submission ? "Submit a new attempt" : "Submit work"}
                </h2>
                <SubmissionForm
                  postId={postId}
                  studentId={studentId}
                  studentName={student.name}
                  resubmission={!!submission}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <PostComments postId={postId} viewerRole="student" />
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
  return <AssignmentStatus status={assignmentState(submission, dueAt)} />;
}
