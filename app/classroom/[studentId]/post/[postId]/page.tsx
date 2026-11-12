import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, ClipboardList, Megaphone, HelpCircle,
  Calendar, Paperclip, ExternalLink, FileText, Inbox,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtDateTime, fmtShortDate } from "@/lib/format";
import { GradeSubmissionForm, SubmissionCard } from "@/components/classroom/grade-submission";
import { EditPostButton, DeletePostButton } from "@/components/classroom-post-dialog";
import type { Post, PostAttachment, Submission, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

type PostType = "material" | "assignment" | "quiz" | "announcement";

const POST_TYPE_CONFIG: Record<PostType, { icon: typeof BookOpen; color: string; bg: string; label: string }> = {
  material: { icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50", label: "Material" },
  assignment: { icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50", label: "Assignment" },
  quiz: { icon: HelpCircle, color: "text-purple-600", bg: "bg-purple-50", label: "Quiz" },
  announcement: { icon: Megaphone, color: "text-emerald-600", bg: "bg-emerald-50", label: "Announcement" },
};

export default async function PostDetailPage({
  params,
}: {
  params: { studentId: string; postId: string };
}) {
  const studentId = Number(params.studentId);
  const postId = Number(params.postId);

  const [student, post] = await Promise.all([
    queryOne<Student>(
      "SELECT id, name, subject, grade_level, phone, email, guardian_name, guardian_contact, active, created_at FROM students WHERE id = ? AND active = 1",
      [studentId]
    ),
    queryOne<Post>("SELECT id, type, title, body, student_id, due_at, topic_id, max_points, created_at, updated_at FROM posts WHERE id = ?", [postId]),
  ]);

  if (!student || !post) notFound();

  const [attachments, submission] = await Promise.all([
    queryAll<PostAttachment>(
      "SELECT id, post_id, file_name, file_url, file_type FROM post_attachments WHERE post_id = ? ORDER BY id",
      [postId]
    ),
    post.type === "assignment"
      ? queryOne<Submission>(
          "SELECT id, post_id, student_id, content, file_url, grade, feedback, submitted_at, graded_at FROM submissions WHERE post_id = ? AND student_id = ? ORDER BY submitted_at DESC",
          [postId, studentId]
        )
      : Promise.resolve(undefined),
  ]);

  const config = POST_TYPE_CONFIG[(post.type as PostType)] || POST_TYPE_CONFIG.material;
  const Icon = config.icon;

  const isAssignment = post.type === "assignment";

  return (
    <>
      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/classroom/${studentId}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
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
          studentId={studentId}
        />
      ) : (
        <PostContent
          post={post}
          student={student}
          config={config}
          Icon={Icon}
          attachments={attachments}
          studentId={studentId}
        />
      )}
    </>
  );
}

function PostContent({
  post,
  student,
  config,
  Icon,
  attachments,
  studentId,
}: {
  post: Post;
  student: Student;
  config: (typeof POST_TYPE_CONFIG)[PostType];
  Icon: typeof BookOpen;
  attachments: PostAttachment[];
  studentId: number;
}) {
  return (
    <Card className="shadow-sm border-0">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex size-11 items-center justify-center rounded-xl ${config.bg} shrink-0`}>
              <Icon size={22} className={config.color} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{post.title}</h1>
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
            <EditPostButton post={post} studentId={studentId} />
            <DeletePostButton postId={post.id} studentId={studentId} />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Body */}
        {post.body && (
          <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {post.body}
          </div>
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
  studentId,
}: {
  post: Post;
  student: Student;
  config: (typeof POST_TYPE_CONFIG)[PostType];
  Icon: typeof BookOpen;
  attachments: PostAttachment[];
  submission: Submission | undefined;
  studentId: number;
}) {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="shadow-sm border-0">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`flex size-11 items-center justify-center rounded-xl ${config.bg} shrink-0`}>
                <Icon size={22} className={config.color} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{post.title}</h1>
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
                <div className="flex items-center gap-3 mt-2">
                  {post.max_points && (
                    <Badge variant="outline" className="text-[10px]">
                      {post.max_points} points
                    </Badge>
                  )}
                  {post.due_at && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Calendar size={12} />
                      Due {fmtDateTime(post.due_at)}
                    </span>
                  )}
                  {submission ? (
                    submission.graded_at ? (
                      <Badge className="text-[10px] bg-emerald-500 text-white">Graded</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Turned in</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">
                      Not submitted
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <EditPostButton post={post} studentId={studentId} />
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
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                1
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructions">
          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              {post.body ? (
                <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {post.body}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No instructions provided.</p>
              )}
              <AttachmentsList attachments={attachments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="student-work">
          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {student.name}&apos;s Work
                </h3>
                {submission?.grade && post.max_points && (
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
                  <Inbox size={36} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No submission yet</p>
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
                      {submission.graded_at ? "Update Grade" : "Grade Submission"}
                    </h4>
                    <GradeSubmissionForm
                      submission={submission}
                      maxPoints={post.max_points}
                      studentId={studentId}
                    />
                  </div>
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
        <a
          key={att.id}
          href={att.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <FileText size={16} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {att.file_name}
            </p>
            {att.file_type && (
              <p className="text-[10px] text-muted-foreground">{att.file_type}</p>
            )}
          </div>
          <ExternalLink size={14} className="text-muted-foreground shrink-0" />
        </a>
      ))}
    </div>
  );
}
