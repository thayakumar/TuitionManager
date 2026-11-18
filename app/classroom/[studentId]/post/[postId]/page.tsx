import { AttachmentCard } from "@/components/attachment-preview";
import { PostComments } from "@/components/post-comments";
import {
  AssignmentStatus,
  assignmentState,
} from "@/components/classroom/assignment-status";
import { RichText } from "@/components/rich-text";
import { requireAdminPage } from "@/lib/auth";
import {
  SubmissionHistory,
  type SubmissionAttempt,
} from "@/components/classroom/submission-history";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Megaphone,
  HelpCircle,
  Calendar,
  Inbox,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtDateTime, fmtShortDate } from "@/lib/format";
import {
  GradeSubmissionForm,
  SubmissionCard,
} from "@/components/classroom/grade-submission";
import {
  EditPostButton,
  DeletePostButton,
} from "@/components/classroom-post-dialog";
import type {
  Post,
  PostAttachment,
  Submission,
  Student,
  Topic,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type PostType = "material" | "assignment" | "quiz" | "announcement";

const POST_TYPE_CONFIG: Record<
  PostType,
  { icon: typeof BookOpen; color: string; bg: string; label: string }
> = {
  material: {
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "Material",
  },
  assignment: {
    icon: ClipboardList,
    color: "text-amber-600",
    bg: "bg-amber-50",
    label: "Assignment",
  },
  quiz: {
    icon: HelpCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    label: "Quiz",
  },
  announcement: {
    icon: Megaphone,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    label: "Announcement",
  },
};

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ studentId: string; postId: string }>;
}) {
  await requireAdminPage();
  const resolvedParams = await params;
  const studentId = Number(resolvedParams.studentId);
  const postId = Number(resolvedParams.postId);

  const [student, post] = await Promise.all([
    queryOne<Student>(
      "SELECT id, name, subject, grade_level, phone, email, guardian_name, guardian_contact, active, created_at FROM students WHERE id = ? AND active = 1",
      [studentId],
    ),
    queryOne<Post>(
      "SELECT id, type, title, body, student_id, due_at, topic_id, max_points, created_at, updated_at, sort_order FROM posts WHERE id = ? AND student_id = ?",
      [postId, studentId],
    ),
  ]);

  if (!student || !post) notFound();

  const [attachments, submission] = await Promise.all([
    queryAll<PostAttachment>(
      "SELECT id, post_id, file_name, file_url, file_type FROM post_attachments WHERE post_id = ? ORDER BY id",
      [postId],
    ),
    post.type === "assignment" || post.type === "quiz"
      ? queryOne<Submission & { version: number }>(
          "SELECT id, post_id, student_id, content, file_url, grade, feedback, submitted_at, graded_at, version FROM submissions WHERE post_id = ? AND student_id = ? ORDER BY submitted_at DESC",
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
  const topics = await queryAll<Topic>(
    "SELECT id, student_id, name, sort_order, created_at FROM topics WHERE student_id = ? ORDER BY sort_order, name",
    [studentId],
  );

  const config =
    POST_TYPE_CONFIG[post.type as PostType] || POST_TYPE_CONFIG.material;
  const Icon = config.icon;

  const isAssignment = post.type === "assignment" || post.type === "quiz";

  return (
    <>
      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/classroom/${studentId}`}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <ArrowLeft size={14} />
            {student.name}&apos;s Classroom
          </Button>
        </Link>
      </div>

      {isAssignment ? (
        <AssignmentDetail
          post={post}
          student={student}
          config={config}
          Icon={Icon}
          attachments={attachments}
          submission={submission}
          attempts={attempts}
          topics={topics}
          studentId={studentId}
        />
      ) : (
        <PostContent
          post={post}
          student={student}
          config={config}
          Icon={Icon}
          attachments={attachments}
          topics={topics}
          studentId={studentId}
        />
      )}
      <PostComments postId={postId} />
    </>
  );
}

function PostContent({
  post,
  student,
  config,
  Icon,
  attachments,
  topics,
  studentId,
}: {
  post: Post;
  student: Student;
  config: (typeof POST_TYPE_CONFIG)[PostType];
  Icon: typeof BookOpen;
  attachments: PostAttachment[];
  topics: Topic[];
  studentId: number;
}) {
  return (
    <Card className="border shadow-none">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={`flex size-11 items-center justify-center rounded-xl ${config.bg} shrink-0`}
            >
              <Icon size={22} className={config.color} />
            </div>
            <div>
              <h1 className="break-words text-2xl font-semibold text-foreground">
                {post.title}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>Tutor</span>
                <span>&middot;</span>
                <span>{fmtShortDate(post.created_at)}</span>
                {post.updated_at && (
                  <>
                    <span>&middot;</span>
                    <span>(Edited {fmtShortDate(post.updated_at)})</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <EditPostButton
              post={post}
              studentId={studentId}
              topics={topics}
              existingAttachments={attachments}
            />
            <DeletePostButton postId={post.id} studentId={studentId} />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Body */}
        {post.body && (
          <RichText
            content={post.body}
            className="text-sm text-foreground whitespace-pre-line leading-relaxed"
          />
        )}

        {/* Attachments */}
        <AttachmentsList attachments={attachments} />
      </CardContent>
    </Card>
  );
}

function AssignmentDetail({
  post,
  student,
  config,
  Icon,
  attachments,
  submission,
  attempts,
  topics,
  studentId,
}: {
  post: Post;
  student: Student;
  config: (typeof POST_TYPE_CONFIG)[PostType];
  Icon: typeof BookOpen;
  attachments: PostAttachment[];
  submission: (Submission & { version: number }) | undefined;
  attempts: SubmissionAttempt[];
  topics: Topic[];
  studentId: number;
}) {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border shadow-none">
        <CardContent className="p-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className={`flex size-11 items-center justify-center rounded-xl ${config.bg} shrink-0`}
              >
                <Icon size={22} className={config.color} />
              </div>
              <div>
                <h1 className="break-words text-2xl font-semibold text-foreground">
                  {post.title}
                </h1>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>Tutor</span>
                  <span>&middot;</span>
                  <span>{fmtShortDate(post.created_at)}</span>
                  {post.updated_at && (
                    <>
                      <span>&middot;</span>
                      <span>(Edited {fmtShortDate(post.updated_at)})</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {post.max_points !== null && (
                    <Badge variant="outline" className="text-xs">
                      {post.max_points} points
                    </Badge>
                  )}
                  {post.due_at && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Calendar size={12} />
                      Due {fmtDateTime(post.due_at)}
                    </span>
                  )}
                  <AssignmentStatus
                    status={assignmentState(submission, post.due_at)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <EditPostButton
                post={post}
                studentId={studentId}
                topics={topics}
                existingAttachments={attachments}
              />
              <DeletePostButton postId={post.id} studentId={studentId} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions + Student Work Tabs */}
      <Tabs defaultValue="instructions">
        <TabsList>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="student-work">
            Student Work
            {submission && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructions">
          <Card className="border shadow-none">
            <CardContent className="p-6">
              {post.body ? (
                <RichText
                  content={post.body}
                  className="text-sm text-foreground whitespace-pre-line leading-relaxed"
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No instructions provided.
                </p>
              )}
              <AttachmentsList attachments={attachments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="student-work">
          <Card className="border shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {student.name}&apos;s Work
                </h3>
                {submission?.graded_at &&
                  submission.grade !== null &&
                  post.max_points !== null && (
                    <span className="text-lg font-bold text-foreground">
                      {submission.grade}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{post.max_points}
                      </span>
                    </span>
                  )}
              </div>

              {!submission ? (
                <div className="text-center py-10">
                  <Inbox
                    size={36}
                    className="mx-auto mb-3 text-muted-foreground/40"
                  />
                  <p className="text-sm font-medium text-foreground">
                    No submission yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The student hasn&apos;t submitted their work.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <SubmissionCard
                    submission={submission}
                    maxPoints={post.max_points}
                  />

                  <Separator />

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">
                      {submission.graded_at
                        ? "Update Grade"
                        : "Grade Submission"}
                    </h4>
                    <GradeSubmissionForm
                      key={`${submission.id}:${submission.version}:${submission.graded_at ?? "pending"}`}
                      submission={submission}
                      maxPoints={post.max_points}
                      studentId={studentId}
                    />
                  </div>
                  <SubmissionHistory
                    attempts={attempts}
                    latestVersion={submission.version}
                    maxPoints={post.max_points}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AttachmentsList({ attachments }: { attachments: PostAttachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Attachments
      </p>
      {attachments.map((att) => (
        <AttachmentCard
          key={att.id}
          fileUrl={att.file_url}
          fileName={att.file_name}
          fileType={att.file_type}
        />
      ))}
    </div>
  );
}
