import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, ClipboardList, Megaphone, HelpCircle,
  Calendar, FileText, ExternalLink, CheckCircle2,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDateTime, fmtShortDate } from "@/lib/format";
import { SubmissionForm } from "@/components/classroom/submission-form";
import type { Post, PostAttachment, Submission, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

type PostType = "material" | "assignment" | "quiz" | "announcement";

const POST_TYPE_CONFIG: Record<PostType, { icon: typeof BookOpen; color: string; bg: string; label: string }> = {
  material: { icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50", label: "Material" },
  assignment: { icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50", label: "Assignment" },
  quiz: { icon: HelpCircle, color: "text-purple-600", bg: "bg-purple-50", label: "Quiz" },
  announcement: { icon: Megaphone, color: "text-emerald-600", bg: "bg-emerald-50", label: "Announcement" },
};

export default async function StudentPostDetailPage({
  params,
}: {
  params: { studentId: string; postId: string };
}) {
  const studentId = Number(params.studentId);
  const postId = Number(params.postId);

  const [student, post] = await Promise.all([
    queryOne<Student>(
      `SELECT id, name, subject, grade_level, phone, email, guardian_name,
              guardian_contact, username, active, created_at
       FROM students WHERE id = ? AND active = 1`,
      [studentId]
    ),
    queryOne<Post>("SELECT * FROM posts WHERE id = ?", [postId]),
  ]);

  if (!student || !post) notFound();

  const [attachments, submission] = await Promise.all([
    queryAll<PostAttachment>(
      "SELECT * FROM post_attachments WHERE post_id = ? ORDER BY id",
      [postId]
    ),
    queryOne<Submission>(
      "SELECT * FROM submissions WHERE post_id = ? AND student_id = ? ORDER BY submitted_at DESC",
      [postId, studentId]
    ),
  ]);

  const config = POST_TYPE_CONFIG[(post.type as PostType)] || POST_TYPE_CONFIG.material;
  const Icon = config.icon;
  const isAssignment = post.type === "assignment";

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/portal/student/${studentId}/classroom`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft size={14} />
            My Class
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm border-0">
        <CardContent className="p-6">
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
              </div>
              {isAssignment && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {post.max_points != null && (
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
                  <SubmissionStatusBadge
                    submission={submission}
                    dueAt={post.due_at}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {post.body && (
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              {post.body}
            </div>
          )}

          <AttachmentsList attachments={attachments} />
        </CardContent>
      </Card>

      {isAssignment && (
        <Card className="shadow-sm border-0 mt-4">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Your Work</h3>

            {submission ? (
              <SubmittedWork submission={submission} maxPoints={post.max_points} />
            ) : (
              <SubmissionForm postId={postId} studentId={studentId} />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SubmissionStatusBadge({
  submission,
  dueAt,
}: {
  submission: Submission | undefined;
  dueAt: string | null;
}) {
  if (submission?.graded_at) {
    return <Badge className="text-[10px] bg-emerald-500 text-white">Graded</Badge>;
  }
  if (submission) {
    const late = dueAt && new Date(submission.submitted_at) > new Date(dueAt);
    return (
      <Badge variant="secondary" className="text-[10px]">
        {late ? "Done late" : "Turned in"}
      </Badge>
    );
  }
  if (dueAt && new Date(dueAt) < new Date()) {
    return (
      <Badge variant="destructive" className="text-[10px]">Missing</Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">Assigned</Badge>
  );
}

function SubmittedWork({
  submission,
  maxPoints,
}: {
  submission: Submission;
  maxPoints: number | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          Submitted {fmtDateTime(submission.submitted_at)}
        </span>
        {submission.graded_at ? (
          <Badge className="text-[10px] bg-emerald-500 text-white">Graded</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">Turned in</Badge>
        )}
      </div>

      {submission.content && (
        <div className="rounded-lg border border-border/50 p-3">
          <p className="text-sm whitespace-pre-line">{submission.content}</p>
        </div>
      )}

      {submission.file_url && (
        <a
          href={submission.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          View attachment
        </a>
      )}

      {submission.grade != null && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-indigo-600" />
            <span className="text-sm font-semibold text-foreground">
              {submission.grade}{maxPoints ? `/${maxPoints}` : ""}
            </span>
          </div>
          {submission.graded_at && (
            <p className="text-[11px] text-muted-foreground">
              Graded on {fmtDateTime(submission.graded_at)}
            </p>
          )}
        </div>
      )}

      {submission.feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-xs font-medium text-emerald-700 mb-1">Feedback</p>
          <p className="text-sm whitespace-pre-line">{submission.feedback}</p>
        </div>
      )}
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
