"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, TextAreaField } from "@/components/form-field";
import { toast } from "sonner";
import {
  createPostAction,
  updatePost,
  deletePostAction,
  createTopic,
} from "@/lib/actions";
import { actionError, ActionValidationError } from "@/lib/action-errors";
import { fmtDateInput } from "@/lib/format";
import type { Post, PostType, Topic } from "@/lib/types";

const POST_TYPES = [
  { value: "material" as PostType, label: "Material", icon: BookOpen },
  { value: "assignment" as PostType, label: "Assignment", icon: ClipboardList },
  { value: "announcement" as PostType, label: "Announcement", icon: Megaphone },
];
const errorMessage = (reason: unknown) =>
  actionError(
    reason,
    "Could not save this change. Your entries are still here; please try again.",
  );

export function ClassroomActions({
  studentId,
  topics = [],
}: {
  studentId: number;
  topics?: Topic[];
}) {
  const [type, setType] = useState<PostType | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {POST_TYPES.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => setType(item.value)}
              className="gap-2"
            >
              <item.icon size={14} className="text-primary" />
              Post {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {type && (
        <PostDialog
          open
          onOpenChange={(open) => {
            if (!open) setType(null);
          }}
          postType={type}
          studentId={studentId}
          topics={topics}
        />
      )}
    </>
  );
}

function PostDialog({
  open,
  onOpenChange,
  postType,
  studentId,
  editPost,
  topics = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postType: PostType;
  studentId: number;
  editPost?: Post;
  topics?: Topic[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const config =
    POST_TYPES.find((item) => item.value === postType) ?? POST_TYPES[0];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      setError("Enter a title.");
      return;
    }
    const points = String(form.get("max_points") ?? "").trim();
    if (points && (!Number.isFinite(Number(points)) || Number(points) < 0)) {
      setError("Points must be zero or a positive number.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (editPost) await updatePost(form);
      else {
        const result = await createPostAction(
          studentId,
          postType,
          title,
          String(form.get("body") ?? "").trim(),
          String(form.get("due_at") ?? "") || null,
          form.get("topic_id") ? Number(form.get("topic_id")) : null,
          points ? Number(points) : null,
        );
        if (!result.success)
          throw new ActionValidationError(
            result.error || "Could not create this post.",
          );
      }
      toast.success(
        editPost
          ? "Post updated and student notified"
          : "Post created and student notified",
      );
      onOpenChange(false);
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon size={18} className="text-primary" />
            {editPost ? "Edit" : "Post"} {config.label}
          </DialogTitle>
          <DialogDescription>
            {editPost
              ? "Changes will be visible to this student and an update notification will be sent."
              : "Share learning content with this student's classroom."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          {editPost && (
            <>
              <input type="hidden" name="id" value={editPost.id} />
              <input type="hidden" name="type" value={postType} />
              <input type="hidden" name="student_id" value={studentId} />
            </>
          )}
          <fieldset disabled={busy} className="space-y-4 py-2">
            <Field
              label="Title"
              name="title"
              required
              defaultValue={editPost?.title ?? ""}
              placeholder="Give this classwork a clear title"
            />
            <TextAreaField
              label="Content"
              name="body"
              rows={4}
              defaultValue={editPost?.body ?? ""}
              placeholder="Add details, instructions, or notes..."
            />
            <TopicSelector
              topics={topics}
              studentId={studentId}
              defaultValue={String(editPost?.topic_id ?? "")}
            />
            {postType === "assignment" && (
              <>
                <Field
                  label="Points"
                  name="max_points"
                  type="number"
                  step="any"
                  defaultValue={editPost?.max_points ?? ""}
                  placeholder="e.g., 100"
                />
                <Field
                  label="Due date and time (Malaysia)"
                  name="due_at"
                  type="datetime-local"
                  defaultValue={
                    editPost?.due_at ? fmtDateInput(editPost.due_at) : ""
                  }
                />
              </>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : editPost ? "Save Changes" : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPostButton({
  post,
  studentId,
  topics = [],
}: {
  post: Post;
  studentId: number;
  topics?: Topic[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        aria-label="Edit post"
        title="Edit post"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
      >
        <Pencil size={16} />
      </Button>
      {open && (
        <PostDialog
          open
          onOpenChange={setOpen}
          postType={post.type}
          studentId={studentId}
          editPost={post}
          topics={topics}
        />
      )}
    </>
  );
}

export function DeletePostButton({
  postId,
  studentId,
}: {
  postId: number;
  studentId: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deletePostAction(postId, studentId);
      toast.success("Post deleted");
      setOpen(false);
      router.push(`/classroom/${studentId}`);
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        aria-label="Delete post"
        title="Delete post"
        variant="ghost"
        size="icon"
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={16} />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This permanently removes the post, its attachments, submissions
              and grading history. The student will be notified. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={remove}
            >
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TopicSelector({
  topics,
  studentId,
  defaultValue,
}: {
  topics: Topic[];
  studentId: number;
  defaultValue: string;
}) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false),
    [newName, setNewName] = useState(""),
    [selected, setSelected] = useState(defaultValue),
    [added, setAdded] = useState<Topic[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const allTopics = [
    ...new Map(
      [...topics, ...added].map((topic) => [topic.id, topic]),
    ).values(),
  ];
  async function create() {
    if (!newName.trim() || busy) return;
    const name = newName.trim();
    setBusy(true);
    setError("");
    try {
      const result = await createTopic(studentId, name);
      if (!result.success || !result.id)
        throw new ActionValidationError("Could not create this topic.");
      const id = result.id;
      setAdded((previous) => [
        ...previous,
        {
          id,
          student_id: studentId,
          name,
          sort_order: 0,
          created_at: new Date().toISOString(),
        },
      ]);
      setSelected(String(id));
      setNewName("");
      setShowNew(false);
      toast.success("Topic created and selected");
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <label htmlFor={`topic-${studentId}`} className="text-sm font-medium">
        Topic
      </label>
      <div className="flex gap-2">
        <select
          id={`topic-${studentId}`}
          name="topic_id"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">No topic</option>
          {allTopics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
        {!showNew && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowNew(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <Plus size={14} />
            New
          </Button>
        )}
      </div>
      {showNew && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            aria-label="New topic name"
            value={newName}
            maxLength={200}
            disabled={busy}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void create();
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setShowNew(false);
              }
            }}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <Button
            type="button"
            aria-label="Create and select topic"
            disabled={busy || !newName.trim()}
            onClick={create}
          >
            <Check size={16} />
          </Button>
          <Button
            type="button"
            aria-label="Cancel new topic"
            variant="outline"
            disabled={busy}
            onClick={() => setShowNew(false)}
          >
            <X size={16} />
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
