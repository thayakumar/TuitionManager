"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Megaphone,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtShortDate } from "@/lib/format";
import { ClassroomActions } from "@/components/classroom-post-dialog";
import {
  CreateTopicButton,
  TopicActions,
} from "@/components/classroom/topic-manager";
import type { Post, PostType, Topic } from "@/lib/types";

type SubmissionInfo = {
  post_id: number;
  grade: string | null;
  graded_at: string | null;
  submitted_at: string;
};

const POST_TYPE_CONFIG: Record<
  PostType,
  {
    icon: typeof BookOpen;
    color: string;
    bg: string;
    textColor: string;
    label: string;
  }
> = {
  material: {
    icon: BookOpen,
    color: "border-l-blue-500",
    bg: "bg-blue-50",
    textColor: "text-blue-600",
    label: "Material",
  },
  assignment: {
    icon: ClipboardList,
    color: "border-l-amber-500",
    bg: "bg-amber-50",
    textColor: "text-amber-600",
    label: "Assignment",
  },
  quiz: {
    icon: HelpCircle,
    color: "border-l-orange-500",
    bg: "bg-orange-50",
    textColor: "text-orange-600",
    label: "Quiz",
  },
  announcement: {
    icon: Megaphone,
    color: "border-l-emerald-500",
    bg: "bg-emerald-50",
    textColor: "text-emerald-600",
    label: "Announcement",
  },
};

export function ClassroomTabs({ studentId, posts, topics, submissions, isAdmin = false }: {
  studentId: number; posts: Post[]; topics: Topic[]; submissions: SubmissionInfo[]; isAdmin?: boolean;
}) {
  const [activeTab, setActiveTab] = useState("stream");
  const submissionMap = new Map(submissions.map((submission) => [submission.post_id, submission]));
  const basePath = isAdmin ? `/classroom/${studentId}` : `/portal/student/${studentId}/classroom`;
  const dueSoon = posts.filter((post) => post.due_at && new Date(post.due_at) >= new Date() && !submissionMap.has(post.id)).slice(0, 4);
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="google-classroom">
      <TabsList className="classroom-navigation" aria-label="Classroom sections">
        <TabsTrigger value="stream">Stream</TabsTrigger>
        <TabsTrigger value="classwork">Classwork</TabsTrigger>
        <TabsTrigger value="grades">{isAdmin ? "Grades" : "My grades"}</TabsTrigger>
      </TabsList>
      <TabsContent value="stream" className="mt-7">
        <div className="classroom-stream-layout">
          <aside className="classroom-upcoming">
            <h2 className="flex items-center gap-2 font-semibold"><CalendarDays size={20} /> Upcoming</h2>
            {dueSoon.length ? dueSoon.map((post) => <Link key={post.id} href={`${basePath}/post/${post.id}`} className="mt-5 block"><p className="text-sm text-muted-foreground">Due {fmtShortDate(post.due_at!)}</p><p className="mt-1 font-medium hover:text-primary">{post.title}</p></Link>) : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">No work due soon. You’re all caught up.</p>}
            <button onClick={() => setActiveTab("classwork")} className="mt-5 flex w-full items-center justify-end gap-2 font-medium text-primary">View classwork <ArrowRight size={18} /></button>
          </aside>
          <div className="min-w-0 space-y-5">
            <div className="classroom-stream-intro">
              <div className="classroom-round-icon"><Megaphone size={24} /></div>
              <div className="min-w-0 flex-1"><p className="font-medium">{isAdmin ? "Share something with your student" : "Your classroom, all together"}</p><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Post an announcement, assignment or learning material." : "Announcements, lessons and your latest classwork."}</p></div>
              {isAdmin && <ClassroomActions studentId={studentId} topics={topics} />}
            </div>
            {posts.length === 0 && <div className="classroom-stream-post p-9 text-center"><BookOpen size={40} className="mx-auto mb-4 text-primary" /><h2 className="text-xl font-medium">This is your classroom stream</h2><p className="mt-3 text-muted-foreground">Class updates and learning materials will appear here.</p></div>}
            {posts.map((post) => { const config = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.material; const Icon = config.icon; return <article key={post.id} className="classroom-stream-post">
              <Link href={`${basePath}/post/${post.id}`} className="block p-5 sm:p-7">
                <div className="flex items-start gap-4"><div className="classroom-round-icon"><Icon size={23} /></div><div className="min-w-0 flex-1"><p className="font-semibold">{config.label}</p><p className="mt-1 text-sm text-muted-foreground">{fmtShortDate(post.created_at)}{post.updated_at && post.updated_at !== post.created_at ? " · Edited" : ""}</p></div>{post.due_at && <span className="text-sm text-muted-foreground">Due {fmtShortDate(post.due_at)}</span>}</div>
                <h2 className="mt-6 text-xl font-medium leading-snug">{post.title}</h2>
                {post.body && <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">{post.body}</p>}
              </Link>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7"><PostStatus post={post} submission={submissionMap.get(post.id)} /><Link href={`${basePath}/post/${post.id}`} className="inline-flex items-center gap-2 font-medium text-primary">Open {config.label.toLowerCase()} <ArrowRight size={18} /></Link></div>
            </article>; })}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="classwork" className="mt-7"><ClassworkTab posts={posts} topics={topics} studentId={studentId} basePath={basePath} isAdmin={isAdmin} submissionMap={submissionMap} /></TabsContent>
      <TabsContent value="grades" className="mt-7"><GradesTab posts={posts} submissionMap={submissionMap} studentId={studentId} basePath={basePath} /></TabsContent>
    </Tabs>
  );
}

function PostStatus({ post, submission }: { post: Post; submission?: SubmissionInfo }) {
  if (post.type !== "assignment" && post.type !== "quiz") return <span className="text-sm text-muted-foreground">Class update</span>;
  const status = submission?.graded_at ? "Graded" : submission ? "Awaiting grading" : post.due_at && new Date(post.due_at) < new Date() ? "Missing" : "Assigned";
  return <Badge variant="outline" className={status === "Missing" ? "border-red-200 bg-red-50 text-red-700" : "bg-secondary text-secondary-foreground"}>{status}</Badge>;
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
  const [selectedTopic, setSelectedTopic] = useState<number | "all" | "none">("all");
  const currentTopic = typeof selectedTopic === "number" && !topics.some((topic) => topic.id === selectedTopic) ? "all" : selectedTopic;
  const topicPosts = new Map<number | null, Post[]>();
  for (const post of posts) {
    const key = post.topic_id;
    if (!topicPosts.has(key)) topicPosts.set(key, []);
    topicPosts.get(key)!.push(post);
  }

  const untopicedPosts = topicPosts.get(null) || [];

  return (
    <div className="classwork-layout">
      <aside className="classwork-topics"><p className="mb-4 font-semibold">Topics</p><button className={currentTopic === "all" ? "selected" : ""} onClick={() => setSelectedTopic("all")}>All topics</button>{untopicedPosts.length > 0 && <button className={currentTopic === "none" ? "selected" : ""} onClick={() => setSelectedTopic("none")}>No topic</button>}{topics.map((topic) => <button key={topic.id} className={currentTopic === topic.id ? "selected" : ""} onClick={() => setSelectedTopic(topic.id)}>{topic.name}</button>)}</aside>
      <div className="min-w-0 space-y-7">
      {isAdmin && (
        <div className="flex items-center justify-between">
          <ClassroomActions studentId={studentId} topics={topics} />
          <CreateTopicButton studentId={studentId} />
        </div>
      )}

      {untopicedPosts.length > 0 && (currentTopic === "all" || currentTopic === "none") && (
        <TopicSection
          name="No topic"
          posts={untopicedPosts}
          basePath={basePath}
          submissionMap={submissionMap}
        />
      )}

      {topics.filter((topic) => currentTopic === "all" || currentTopic === topic.id).map((topic) => {
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
        <Card className="border shadow-none">
          <CardContent className="py-12 text-center">
            <BookOpen
              size={36}
              className="mx-auto mb-3 text-muted-foreground/40"
            />
            <p className="text-sm text-muted-foreground">No classwork yet</p>
          </CardContent>
        </Card>
      )}
      </div>
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
    <div className="classroom-topic-section">
      <div className="flex items-center gap-2 py-2">
        <button
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <Chevron size={16} className="text-muted-foreground shrink-0" />
          <span className="break-words text-2xl font-medium text-primary">
            {name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({posts.length})
          </span>
        </button>
        {isAdmin && topicId !== undefined && studentId !== undefined && (
          <TopicActions
            topicId={topicId}
            topicName={name}
            studentId={studentId}
          />
        )}
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-1">
          {posts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No items</p>
          ) : (
            posts.map((post) => {
              const config =
                POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.material;
              const Icon = config.icon;
              const sub = submissionMap.get(post.id);

              return (
                <Link
                  key={post.id}
                  href={`${basePath}/post/${post.id}`}
                  className="classwork-item flex flex-wrap items-center gap-4 rounded-xl p-5 hover:bg-secondary transition-colors group"
                >
                  <div
                    className={`flex size-12 items-center justify-center rounded-full ${config.bg} shrink-0`}
                  >
                    <Icon size={18} className={config.textColor} />
                  </div>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-lg font-medium text-foreground break-words group-hover:text-primary transition-colors">
                      {post.title}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground shrink-0">
                    {post.due_at
                      ? `Due ${fmtShortDate(post.due_at)}`
                      : `Posted ${fmtShortDate(post.created_at)}`}
                  </div>
                  {(post.type === "assignment" || post.type === "quiz") &&
                    (() => {
                      let status: string;
                      let statusClass: string;
                      if (sub?.graded_at) {
                        status = "Graded";
                        statusClass =
                          "border-emerald-300 text-emerald-700 bg-emerald-50";
                      } else if (sub) {
                        status = "Awaiting grading";
                        statusClass =
                          "border-blue-300 text-blue-700 bg-blue-50";
                      } else if (
                        post.due_at &&
                        new Date(post.due_at) < new Date()
                      ) {
                        status = "Missing";
                        statusClass = "border-red-300 text-red-700 bg-red-50";
                      } else {
                        status = "Assigned";
                        statusClass =
                          "border-muted-foreground/30 text-muted-foreground";
                      }
                      return (
                        <Badge
                          variant="outline"
                          className={`text-xs px-2.5 py-0.5 shrink-0 ${statusClass}`}
                        >
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
  const gradable = posts.filter(
    (p) => p.type === "assignment" || p.type === "quiz",
  );

  if (gradable.length === 0) {
    return (
      <Card className="border shadow-none">
        <CardContent className="py-12 text-center">
          <ClipboardList
            size={36}
            className="mx-auto mb-3 text-muted-foreground/40"
          />
          <p className="text-sm text-muted-foreground">
            No graded assignments yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-none overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">
                Assignment
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                Due
              </th>
              <th className="text-center p-3 font-medium text-muted-foreground">
                Points
              </th>
              <th className="text-center p-3 font-medium text-muted-foreground">
                Score
              </th>
              <th className="text-center p-3 font-medium text-muted-foreground">
                Status
              </th>
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
                status = "Awaiting grading";
                statusClass = "text-blue-700 bg-blue-50";
              } else if (post.due_at && new Date(post.due_at) < new Date()) {
                status = "Missing";
                statusClass = "text-red-700 bg-red-50";
              } else {
                status = "Assigned";
                statusClass = "text-muted-foreground bg-muted/50";
              }

              return (
                <tr
                  key={post.id}
                  className="border-b last:border-0 hover:bg-muted/20"
                >
                  <td className="p-3">
                    <Link
                      href={`${basePath}/post/${post.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
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
                    {sub?.graded_at && sub.grade !== null
                      ? `${sub.grade}${post.max_points !== null ? `/${post.max_points}` : ""}`
                      : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-xs px-2.5 py-0.5 ${statusClass}`}
                    >
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
