import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ClipboardList, Megaphone, HelpCircle,
  Calendar, ArrowLeft,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import type { Student, Post } from "@/lib/types";
import { ClassroomActions, EditPostButton, DeletePostButton } from "@/components/classroom-post-dialog";

export const dynamic = "force-dynamic";

type PostType = "material" | "assignment" | "quiz" | "announcement";

const POST_TYPE_CONFIG: Record<PostType, { icon: typeof BookOpen; color: string; bg: string; textColor: string; label: string }> = {
  material: { icon: BookOpen, color: "border-l-blue-500", bg: "bg-blue-50", textColor: "text-blue-600", label: "Material" },
  assignment: { icon: ClipboardList, color: "border-l-amber-500", bg: "bg-amber-50", textColor: "text-amber-600", label: "Assignment" },
  quiz: { icon: HelpCircle, color: "border-l-purple-500", bg: "bg-purple-50", textColor: "text-purple-600", label: "Quiz" },
  announcement: { icon: Megaphone, color: "border-l-emerald-500", bg: "bg-emerald-50", textColor: "text-emerald-600", label: "Announcement" },
};

export default async function StudentClassroomPage({ params }: { params: { studentId: string } }) {
  const studentId = Number(params.studentId);
  const student = await queryOne<Student>(
    "SELECT * FROM students WHERE id = ? AND active = 1",
    [studentId]
  );
  if (!student) notFound();

  const posts = await queryAll<Post>(
    "SELECT * FROM posts WHERE student_id = ? ORDER BY created_at DESC",
    [studentId]
  );

  return (
    <>
      <PageHeader
        title={`${student.name}'s Classroom`}
        subtitle={student.subject || "Class materials and announcements"}
        action={
          <div className="flex gap-2">
            <Link href="/classroom">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft size={14} />
                All Classrooms
              </Button>
            </Link>
            <ClassroomActions studentId={studentId} />
          </div>
        }
      />

      {posts.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="py-16 text-center">
            <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-base font-medium text-foreground">No materials yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Post materials, assignments, and announcements for this student.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const config = POST_TYPE_CONFIG[post.type as PostType] || POST_TYPE_CONFIG.material;
            const Icon = config.icon;

            return (
              <Card key={post.id} className={`shadow-sm border-0 border-l-4 ${config.color}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${config.bg} shrink-0`}>
                      <Icon size={20} className={config.textColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] ${config.textColor}`}>
                            {config.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {fmtDateTime(post.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <EditPostButton post={post} studentId={studentId} />
                          <DeletePostButton postId={post.id} studentId={studentId} />
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-1.5">
                        {post.title}
                      </h3>
                      {post.body && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
                          {post.body}
                        </p>
                      )}
                      {post.due_at && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                          <Calendar size={12} />
                          Due: {fmtDateTime(post.due_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
