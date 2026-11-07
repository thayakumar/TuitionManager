import { notFound } from "next/navigation";
import {
  BookOpen, ClipboardList, Megaphone, HelpCircle,
  Calendar, GraduationCap,
} from "lucide-react";
import { queryAll, queryOne } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import type { Student, Post } from "@/lib/types";

export const dynamic = "force-dynamic";

const POST_TYPE_CONFIG = {
  material: { icon: BookOpen, color: "border-l-blue-500", bg: "bg-blue-50", textColor: "text-blue-600", label: "Material" },
  assignment: { icon: ClipboardList, color: "border-l-amber-500", bg: "bg-amber-50", textColor: "text-amber-600", label: "Assignment" },
  quiz: { icon: HelpCircle, color: "border-l-purple-500", bg: "bg-purple-50", textColor: "text-purple-600", label: "Quiz" },
  announcement: { icon: Megaphone, color: "border-l-emerald-500", bg: "bg-emerald-50", textColor: "text-emerald-600", label: "Announcement" },
};

export default async function StudentClassroomPage({
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

  const posts = await queryAll<Post>(
    `SELECT * FROM posts
     WHERE student_id = ? OR student_id IS NULL
     ORDER BY created_at DESC`,
    [id]
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap size={22} className="text-indigo-500" />
          My Class
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Class materials, assignments, and announcements
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="py-16 text-center">
            <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-base font-medium text-foreground">No class materials yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Materials, assignments, and announcements will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const config = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.material;
            const Icon = config.icon;

            return (
              <Card key={post.id} className={`shadow-sm border-0 border-l-4 ${config.color}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${config.bg} shrink-0`}>
                      <Icon size={20} className={config.textColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${config.textColor}`}>
                          {config.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {fmtDateTime(post.created_at)}
                        </span>
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
