"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen, ClipboardList, Megaphone, HelpCircle,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtShortDate } from "@/lib/format";
import { ClassroomActions } from "@/components/classroom-post-dialog";
import { CreateTopicButton, TopicActions } from "@/components/classroom/topic-manager";
import type { Post, PostType, Topic } from "@/lib/types";

type SubmissionInfo = {
  post_id: number;
  grade: string | null;
  graded_at: string | null;
  submitted_at: string;
};

const POST_TYPE_CONFIG: Record<PostType, {
  icon: typeof BookOpen;
  color: string;
  bg: string;
  textColor: string;
  label: string;
}> = {
  material: { icon: BookOpen, color: "border-l-blue-500", bg: "bg-blue-50", textColor: "text-blue-600", label: "Material" },
  assignment: { icon: ClipboardList, color: "border-l-amber-500", bg: "bg-amber-50", textColor: "text-amber-600", label: "Assignment" },
  quiz: { icon: HelpCircle, color: "border-l-purple-500", bg: "bg-purple-50", textColor: "text-purple-600", label: "Quiz" },
  announcement: { icon: Megaphone, color: "border-l-emerald-500", bg: "bg-emerald-50", textColor: "text-emerald-600", label: "Announcement" },
};

export function ClassroomTabs({
  studentId,
  posts,
  topics,
  submissions,
  isAdmin = false,
}: {
  studentId: number;
  posts: Post[];
  topics: Topic[];
  submissions: SubmissionInfo[];
  isAdmin?: boolean;
}) {
  const submissionMap = new Map(submissions.map((s) => [s.post_id, s]));
  const basePath = isAdmin ? `/classroom/${studentId}` : `/portal/student/${studentId}/classroom`;

  if (!isAdmin) {
    return (
      <ClassworkTab
        posts={posts}
        topics={topics}
        studentId={studentId}
        basePath={basePath}
        isAdmin={false}
        submissionMap={submissionMap}
      />
    );
  }

  return (
    <Tabs defaultValue="classwork">
      <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 w-full justify-start gap-0">
        <TabsTrigger
          value="classwork"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground"
        >
          Classwork
        </TabsTrigger>
        <TabsTrigger
          value="grades"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground"
        >
          Grades
        </TabsTrigger>
      </TabsList>

      <TabsContent value="classwork" className="mt-4">
        <ClassworkTab
          posts={posts}
          topics={topics}
          studentId={studentId}
          basePath={basePath}
          isAdmin
          submissionMap={submissionMap}
        />
      </TabsContent>

      <TabsContent value="grades" className="mt-4">
        <GradesTab posts={posts} submissionMap={submissionMap} studentId={studentId} basePath={basePath} />
      </TabsContent>
    </Tabs>
  );
}

function ClassworkTab({
  posts,
  topics,
  studentId,
  basePath,
  isAdmin,
  submissionMap,
}: {
  posts: Post[];
  topics: Topic[];
  studentId: number;
  basePath: string;
  isAdmin: boolean;
  submissionMap: Map<number, SubmissionInfo>;
}) {
  const topicPosts = new Map<number | null, Post[]>();
  for (const post of posts) {
    const key = post.topic_id;
    if (!topicPosts.has(key)) topicPosts.set(key, []);
    topicPosts.get(key)!.push(post);
  }

  const untopicedPosts = topicPosts.get(null) || [];

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-between">
          <ClassroomActions studentId={studentId} topics={topics} />
          <CreateTopicButton studentId={studentId} />
        </div>
      )}

      {untopicedPosts.length > 0 && (
        <TopicSection
          name="No topic"
          posts={untopicedPosts}
          basePath={basePath}
          submissionMap={submissionMap}
        />
      )}

      {topics.map((topic) => {
        const tPosts = topicPosts.get(topic.id) || [];
        return (
          <TopicSection
            key={topic.id}
            name={topic.name}
            topicId={topic.id}
            studentId={studentId}
            posts={tPosts}
            basePath={basePath}
            isAdmin={isAdmin}
            submissionMap={submissionMap}
          />
        );
      })}

      {posts.length === 0 && (
        <Card className="shadow-sm border-0">
          <CardContent className="py-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No classwork yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TopicSection({
  name,
  topicId,
  studentId,
  posts,
  basePath,
  isAdmin,
  submissionMap,
}: {
  name: string;
  topicId?: number;
  studentId?: number;
  posts: Post[];
  basePath: string;
  isAdmin?: boolean;
  submissionMap: Map<number, SubmissionInfo>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const Chevron = collapsed ? ChevronRight : ChevronDown;

  return (
    <div className="border-b border-border pb-2">
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <Chevron size={16} className="text-muted-foreground shrink-0" />
          <span className="text-lg font-semibold text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground">({posts.length})</span>
        </button>
        {isAdmin && topicId !== undefined && studentId !== undefined && (
          <TopicActions topicId={topicId} topicName={name} studentId={studentId} />
        )}
      </div>

      {!collapsed && (
        <div className="ml-6 space-y-1">
          {posts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No items</p>
          ) : (
            posts.map((post) => {
              const config = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.material;
              const Icon = config.icon;
              const sub = submissionMap.get(post.id);

              return (
                <Link
                  key={post.id}
                  href={`${basePath}/post/${post.id}`}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/40 transition-colors group"
                >
                  <div className={`flex size-9 items-center justify-center rounded-lg ${config.bg} shrink-0`}>
                    <Icon size={18} className={config.textColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {post.title}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground shrink-0">
                    {post.due_at
                      ? `Due ${fmtShortDate(post.due_at)}`
                      : `Posted ${fmtShortDate(post.created_at)}`}
                  </div>
                  {(post.type === "assignment" || post.type === "quiz") && (() => {
                    let status: string;
                    let statusClass: string;
                    if (sub?.graded_at) {
                      status = "Graded";
                      statusClass = "border-emerald-300 text-emerald-700 bg-emerald-50";
                    } else if (sub) {
                      status = "Turned in";
                      statusClass = "border-blue-300 text-blue-700 bg-blue-50";
                    } else if (post.due_at && new Date(post.due_at) < new Date()) {
                      status = "Missing";
                      statusClass = "border-red-300 text-red-700 bg-red-50";
                    } else {
                      status = "Assigned";
                      statusClass = "border-muted-foreground/30 text-muted-foreground";
                    }
                    return (
                      <Badge variant="outline" className={`text-xs px-2.5 py-0.5 shrink-0 ${statusClass}`}>
                        {status}
                      </Badge>
                    );
                  })()}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function GradesTab({
  posts,
  submissionMap,
  studentId,
  basePath,
}: {
  posts: Post[];
  submissionMap: Map<number, SubmissionInfo>;
  studentId: number;
  basePath: string;
}) {
  const gradable = posts.filter((p) => p.type === "assignment" || p.type === "quiz");

  if (gradable.length === 0) {
    return (
      <Card className="shadow-sm border-0">
        <CardContent className="py-12 text-center">
          <ClipboardList size={36} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No graded assignments yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Assignment</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Points</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Score</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {gradable.map((post) => {
              const sub = submissionMap.get(post.id);
              let status: string;
              let statusClass: string;

              if (sub?.graded_at) {
                status = "Graded";
                statusClass = "text-emerald-700 bg-emerald-50";
              } else if (sub) {
                status = "Submitted";
                statusClass = "text-blue-700 bg-blue-50";
              } else if (post.due_at && new Date(post.due_at) < new Date()) {
                status = "Missing";
                statusClass = "text-red-700 bg-red-50";
              } else {
                status = "Assigned";
                statusClass = "text-muted-foreground bg-muted/50";
              }

              return (
                <tr key={post.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3">
                    <Link href={`${basePath}/post/${post.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {post.title}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {post.due_at ? fmtShortDate(post.due_at) : "—"}
                  </td>
                  <td className="p-3 text-center text-muted-foreground">
                    {post.max_points ?? "—"}
                  </td>
                  <td className="p-3 text-center font-medium">
                    {sub?.grade
                      ? `${sub.grade}${post.max_points ? `/${post.max_points}` : ""}`
                      : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${statusClass}`}>
                      {status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
