"use client";
import {
  AssignmentStatus,
  assignmentState,
} from "@/components/classroom/assignment-status";
import { TableExplorer } from "@/components/table-explorer";
import { richTextPlainText } from "@/lib/rich-text";
import { useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  GripVertical,
  Move,
  ArrowRight,
  BookOpen,
  ClipboardList,
  Megaphone,
  HelpCircle,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { moveClassworkPost } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  { icon: typeof BookOpen; label: string; bg: string; textColor: string }
> = {
  material: {
    icon: BookOpen,
    label: "Material",
    bg: "bg-blue-50",
    textColor: "text-blue-700",
  },
  assignment: {
    icon: ClipboardList,
    label: "Assignment",
    bg: "bg-amber-50",
    textColor: "text-amber-700",
  },
  quiz: {
    icon: HelpCircle,
    label: "Quiz",
    bg: "bg-orange-50",
    textColor: "text-orange-700",
  },
  announcement: {
    icon: Megaphone,
    label: "Announcement",
    bg: "bg-emerald-50",
    textColor: "text-emerald-700",
  },
};
const normalise = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
const ordered = (posts: Post[]) =>
  [...posts].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || b.id - a.id,
  );

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
  const [activeTab, setActiveTab] = useState("stream"),
    [search, setSearch] = useState("");
  const submissionMap = new Map(submissions.map((s) => [s.post_id, s]));
  const basePath = isAdmin
    ? `/classroom/${studentId}`
    : `/portal/student/${studentId}/classroom`;
  const query = normalise(search);
  const visible = posts.filter(
    (post) =>
      !query ||
      normalise(
        [
          post.title,
          richTextPlainText(post.body),
          POST_TYPE_CONFIG[post.type]?.label,
          topics.find((t) => t.id === post.topic_id)?.name,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
  );
  const dueSoon = posts
    .filter(
      (post) =>
        post.due_at &&
        new Date(post.due_at) >= new Date() &&
        !submissionMap.has(post.id),
    )
    .slice(0, 4);
  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="classroom-workspace"
    >
      <TabsList
        className="classroom-navigation"
        aria-label="Classroom sections"
      >
        <TabsTrigger value="stream">Stream</TabsTrigger>
        <TabsTrigger value="classwork">Classwork</TabsTrigger>
        <TabsTrigger value="grades">
          {isAdmin ? "Grades" : "My grades"}
        </TabsTrigger>
      </TabsList>
      {activeTab !== "grades" && (
        <div className="classroom-search-bar">
          <div className="classroom-search-input">
            <Search size={21} />
            <input
              type="search"
              aria-label="Search classroom"
              placeholder="Search posts, topics or keywords"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear classroom search"
                onClick={() => setSearch("")}
              >
                <X size={20} />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground" role="status">
            {query
              ? `${visible.length} ${visible.length === 1 ? "result" : "results"}`
              : `${posts.length} classroom ${posts.length === 1 ? "post" : "posts"}`}
          </p>
        </div>
      )}
      <TabsContent value="stream" className="mt-6">
        <div className="classroom-stream-layout">
          <aside className="classroom-upcoming">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarDays size={20} /> Upcoming
            </h2>
            {dueSoon.length ? (
              dueSoon.map((post) => (
                <Link
                  key={post.id}
                  href={`${basePath}/post/${post.id}`}
                  className="mt-4 block"
                >
                  <p className="text-sm text-muted-foreground">
                    Due {fmtShortDate(post.due_at!)}
                  </p>
                  <p className="mt-1 font-medium">{post.title}</p>
                </Link>
              ))
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                No work due soon.
              </p>
            )}
            <button
              onClick={() => setActiveTab("classwork")}
              className="mt-4 flex w-full items-center justify-end gap-2 font-medium text-primary"
            >
              View classwork <ArrowRight size={17} />
            </button>
          </aside>
          <div className="min-w-0 space-y-5">
            <div className="classroom-stream-intro">
              <div className="classroom-round-icon">
                <Megaphone size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {isAdmin ? "Share a class update" : "Your classroom updates"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAdmin
                    ? "Add learning materials, assignments or announcements."
                    : "Read announcements and open your latest work."}
                </p>
              </div>
              {isAdmin && (
                <ClassroomActions studentId={studentId} topics={topics} />
              )}
            </div>
            {!visible.length && (
              <SearchEmpty
                searched={Boolean(query)}
                onClear={() => setSearch("")}
              />
            )}
            {visible.map((post) => {
              const config =
                  POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.material,
                Icon = config.icon;
              return (
                <article key={post.id} className="classroom-stream-post">
                  <Link
                    href={`${basePath}/post/${post.id}`}
                    className="block p-5 sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`classroom-round-icon ${config.bg} ${config.textColor}`}
                      >
                        <Icon size={23} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {config.label} · {fmtShortDate(post.created_at)}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold leading-snug">
                          {post.title}
                        </h2>
                      </div>
                      {post.due_at && (
                        <span className="text-sm text-muted-foreground">
                          Due {fmtShortDate(post.due_at)}
                        </span>
                      )}
                    </div>
                    {post.body && (
                      <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {richTextPlainText(post.body)}
                      </p>
                    )}
                  </Link>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
                    <PostStatus
                      post={post}
                      submission={submissionMap.get(post.id)}
                    />
                    <Link
                      href={`${basePath}/post/${post.id}`}
                      className="inline-flex items-center gap-2 font-medium text-primary"
                    >
                      Open {config.label.toLowerCase()} <ArrowRight size={18} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="classwork" className="mt-6">
        <ClassworkPanel
          studentId={studentId}
          posts={posts}
          visible={visible}
          topics={topics}
          basePath={basePath}
          isAdmin={isAdmin}
          searching={Boolean(query)}
          submissionMap={submissionMap}
          onClear={() => setSearch("")}
        />
      </TabsContent>
      <TabsContent value="grades" className="mt-6">
        <GradesTab
          posts={posts}
          submissionMap={submissionMap}
          studentId={studentId}
          basePath={basePath}
        />
      </TabsContent>
    </Tabs>
  );
}
function SearchEmpty({
  searched,
  onClear,
}: {
  searched: boolean;
  onClear: () => void;
}) {
  return (
    <div className="classroom-search-empty">
      <Search size={30} className="mx-auto mb-3 text-primary" />
      <h2 className="text-xl font-semibold">
        {searched ? "No matching posts" : "No classwork yet"}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {searched
          ? "Try another title, topic or keyword."
          : "Your materials and assignments will appear here."}
      </p>
      {searched && (
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          className="mt-5"
        >
          Clear search
        </Button>
      )}
    </div>
  );
}
function PostStatus({
  post,
  submission,
}: {
  post: Post;
  submission?: SubmissionInfo;
}) {
  if (post.type !== "assignment" && post.type !== "quiz")
    return <span className="text-sm text-muted-foreground">Class update</span>;
  return <AssignmentStatus status={assignmentState(submission, post.due_at)} />;
}

function ClassworkPanel({
  studentId,
  posts,
  visible,
  topics,
  basePath,
  isAdmin,
  searching,
  submissionMap,
  onClear,
}: {
  studentId: number;
  posts: Post[];
  visible: Post[];
  topics: Topic[];
  basePath: string;
  isAdmin: boolean;
  searching: boolean;
  submissionMap: Map<number, SubmissionInfo>;
  onClear: () => void;
}) {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<number | "all" | "none">(
      "all",
    ),
    [dragged, setDragged] = useState<number | null>(null),
    [over, setOver] = useState<string | null>(null),
    [moving, setMoving] = useState(false),
    [error, setError] = useState<string | null>(null),
    [movePost, setMovePost] = useState<Post | null>(null);
  const currentTopic = searching
    ? "all"
    : typeof selectedTopic === "number" &&
        !topics.some((t) => t.id === selectedTopic)
      ? "all"
      : selectedTopic;
  async function move(
    pid: number,
    tid: number | null,
    before: number | null,
  ): Promise<boolean> {
    if (moving) return false;
    setMoving(true);
    setError(null);
    try {
      const result = await moveClassworkPost(pid, studentId, tid, before);
      if (!result.success) {
        setError(result.error || "Could not move this post. Try again.");
        return false;
      }
      toast.success("Post position saved");
      router.refresh();
      return true;
    } catch (reason) {
      setError(actionError(reason, "Could not move this post. Try again."));
      return false;
    } finally {
      setMoving(false);
      setDragged(null);
      setOver(null);
    }
  }
  function drop(
    event: DragEvent,
    topicId: number | null,
    before: number | null,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const pid = dragged;
    setDragged(null);
    setOver(null);
    if (pid !== null && posts.some((p) => p.id === pid) && pid !== before)
      void move(pid, topicId, before);
  }
  const groups = [
    { id: null as number | null, name: "No topic" },
    ...topics.map((t) => ({ id: t.id, name: t.name })),
  ]
    .filter(
      (g) =>
        currentTopic === "all" ||
        (currentTopic === "none" ? g.id === null : g.id === currentTopic),
    )
    .filter(
      (g) =>
        g.id !== null || visible.some((p) => p.topic_id === null) || isAdmin,
    )
    .filter(
      (group) =>
        !searching || visible.some((post) => post.topic_id === group.id),
    );
  return (
    <div className="classwork-layout">
      <aside className="classwork-topics">
        <p className="mb-3 font-semibold">Topics</p>
        <button
          className={currentTopic === "all" ? "selected" : ""}
          onClick={() => setSelectedTopic("all")}
        >
          All topics
        </button>
        {posts.some((p) => p.topic_id === null) && (
          <button
            disabled={searching}
            className={currentTopic === "none" ? "selected" : ""}
            onClick={() => setSelectedTopic("none")}
          >
            No topic
          </button>
        )}
        {topics.map((topic) => (
          <button
            disabled={searching}
            key={topic.id}
            className={currentTopic === topic.id ? "selected" : ""}
            onClick={() => setSelectedTopic(topic.id)}
          >
            {topic.name}
          </button>
        ))}
        {searching && (
          <p className="mt-3 text-sm text-muted-foreground">
            Search covers all topics.
          </p>
        )}
      </aside>
      <div className="min-w-0 space-y-6" aria-busy={moving}>
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ClassroomActions studentId={studentId} topics={topics} />
            <CreateTopicButton studentId={studentId} />
          </div>
        )}
        {isAdmin && posts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {searching
              ? "Clear search to drag posts. Use Move post to choose a destination."
              : "Drag a post to reorder it or drop it under another topic. Use its move button for more options."}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            {error}
          </p>
        )}
        {!visible.length && (
          <SearchEmpty searched={searching} onClear={onClear} />
        )}
        {groups.map((group) => {
          const items = ordered(visible.filter((p) => p.topic_id === group.id));
          return (
            <section
              key={group.id ?? "none"}
              className="classroom-topic-section"
              data-topic-id={group.id ?? "none"}
              onDragOver={(e) => {
                if (dragged !== null) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => drop(e, group.id, null)}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-medium text-primary">
                  {group.name}
                  <span className="ml-3 text-sm font-normal text-muted-foreground">
                    {items.length}
                  </span>
                </h2>
                {isAdmin && group.id !== null && (
                  <TopicActions
                    topicId={group.id}
                    topicName={group.name}
                    studentId={studentId}
                  />
                )}
              </div>
              {items.map((post) => {
                const config =
                    POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.material,
                  Icon = config.icon;
                return (
                  <div
                    key={post.id}
                    className={`classwork-post-row ${over === `post:${post.id}` ? "drop-before" : ""}`}
                    data-post-id={post.id}
                    draggable={isAdmin && !searching && !moving}
                    onDragStart={(e) => {
                      setDragged(post.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(post.id));
                    }}
                    onDragEnd={() => {
                      setDragged(null);
                      setOver(null);
                    }}
                    onDragOver={(e) => {
                      if (dragged !== null && dragged !== post.id) {
                        e.preventDefault();
                        e.stopPropagation();
                        setOver(`post:${post.id}`);
                      }
                    }}
                    onDrop={(e) => drop(e, group.id, post.id)}
                  >
                    {isAdmin && (
                      <button
                        type="button"
                        className="post-move-handle"
                        aria-label={`Move ${post.title}`}
                        disabled={moving}
                        onClick={() => {
                          setError(null);
                          setMovePost(post);
                        }}
                        title="Drag or choose where to move"
                      >
                        <GripVertical size={20} />
                      </button>
                    )}
                    <Link
                      href={`${basePath}/post/${post.id}`}
                      className="classwork-post-link"
                    >
                      <span
                        className={`classroom-round-icon ${config.bg} ${config.textColor}`}
                      >
                        <Icon size={22} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block break-words text-lg font-medium">
                          {post.title}
                        </strong>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {config.label}
                          {post.due_at
                            ? ` · Due ${fmtShortDate(post.due_at)}`
                            : ""}
                        </span>
                      </span>
                      <PostStatus
                        post={post}
                        submission={submissionMap.get(post.id)}
                      />
                    </Link>
                  </div>
                );
              })}
              {isAdmin && !searching && (
                <div
                  className={`classwork-drop-end ${dragged !== null ? "is-dragging" : ""} ${over === `topic:${group.id}` ? "is-over" : ""}`}
                  data-drop-topic={group.id ?? "none"}
                  onDragOver={(e) => {
                    if (dragged !== null) {
                      e.preventDefault();
                      e.stopPropagation();
                      setOver(`topic:${group.id}`);
                    }
                  }}
                  onDrop={(e) => drop(e, group.id, null)}
                >
                  {dragged !== null
                    ? `Drop at end of ${group.name}`
                    : items.length
                      ? ""
                      : "No posts in this topic"}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <MovePostDialog
        post={movePost}
        topics={topics}
        posts={posts}
        busy={moving}
        onClose={() => {
          if (!moving) setMovePost(null);
        }}
        onMove={async (tid, before) => {
          if (movePost && (await move(movePost.id, tid, before)))
            setMovePost(null);
        }}
        error={error}
      />
    </div>
  );
}
function MovePostDialog({
  post,
  topics,
  posts,
  busy,
  onClose,
  onMove,
  error,
}: {
  post: Post | null;
  topics: Topic[];
  posts: Post[];
  busy: boolean;
  onClose: () => void;
  onMove: (topic: number | null, before: number | null) => Promise<void>;
  error: string | null;
}) {
  return (
    <Dialog
      open={Boolean(post)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Move post</DialogTitle>
          <DialogDescription>
            Choose its topic and position. Student work and grades stay with
            this post.
          </DialogDescription>
        </DialogHeader>
        {post && (
          <MovePostForm
            key={post.id}
            post={post}
            topics={topics}
            posts={posts}
            busy={busy}
            onClose={onClose}
            onMove={onMove}
            error={error}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function MovePostForm({
  post,
  topics,
  posts,
  busy,
  onClose,
  onMove,
  error,
}: {
  post: Post;
  topics: Topic[];
  posts: Post[];
  busy: boolean;
  onClose: () => void;
  onMove: (topic: number | null, before: number | null) => Promise<void>;
  error: string | null;
}) {
  const [topic, setTopic] = useState(String(post.topic_id ?? "")),
    [before, setBefore] = useState("");
  const choices = ordered(
    posts.filter(
      (p) =>
        p.id !== post.id &&
        (p.topic_id ?? null) === (topic ? Number(topic) : null),
    ),
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onMove(
          topic ? Number(topic) : null,
          before ? Number(before) : null,
        );
      }}
      className="space-y-5"
    >
      <p className="rounded-xl bg-secondary p-4 font-semibold">{post.title}</p>
      <label className="field-group">
        <span className="field-label">Topic</span>
        <select
          aria-label="Destination topic"
          value={topic}
          disabled={busy}
          onChange={(e) => {
            setTopic(e.target.value);
            setBefore("");
          }}
          className="studio-input"
        >
          <option value="">No topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field-group">
        <span className="field-label">Position</span>
        <select
          aria-label="Position in topic"
          value={before}
          disabled={busy}
          onChange={(e) => setBefore(e.target.value)}
          className="studio-input"
        >
          <option value="">End of topic</option>
          {choices.map((p) => (
            <option key={p.id} value={p.id}>
              Before {p.title}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          <Move size={18} />
          {busy ? "Moving…" : "Move post"}
        </Button>
      </DialogFooter>
    </form>
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
        <TableExplorer label="Gradebook">
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
                      <AssignmentStatus
                        status={assignmentState(sub, post.due_at)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableExplorer>
      </div>
    </Card>
  );
}
