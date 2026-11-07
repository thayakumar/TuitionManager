"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, Megaphone, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, TextAreaField } from "@/components/form-field";
import { createPostAction, updatePost, deletePostAction, createTopic } from "@/lib/actions";
import type { Post, PostType, Topic } from "@/lib/types";

const POST_TYPES = [
  { value: "material" as PostType, label: "Post Material", icon: BookOpen, color: "text-blue-600" },
  { value: "assignment" as PostType, label: "Post Assignment", icon: ClipboardList, color: "text-amber-600" },
  { value: "announcement" as PostType, label: "Post Announcement", icon: Megaphone, color: "text-emerald-600" },
];

export function ClassroomActions({ studentId, topics = [] }: { studentId: number; topics?: Topic[] }) {
  const [open, setOpen] = useState(false);
  const [postType, setPostType] = useState<PostType>("material");

  function openDialog(type: PostType) {
    setPostType(type);
    setOpen(true);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            New Post
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {POST_TYPES.map((pt) => (
            <DropdownMenuItem key={pt.value} onClick={() => openDialog(pt.value)} className="gap-2">
              <pt.icon size={14} className={pt.color} />
              {pt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <PostDialog
        open={open}
        onOpenChange={setOpen}
        postType={postType}
        studentId={studentId}
        topics={topics}
      />
    </>
  );
}

function PostDialog({
  open, onOpenChange, postType, studentId, editPost, topics = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postType: PostType;
  studentId: number;
  editPost?: Post;
  topics?: Topic[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const config = POST_TYPES.find((p) => p.value === postType) || POST_TYPES[0];
  const isEdit = !!editPost;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        await updatePost(formData);
      } else {
        const title = String(formData.get("title") || "").trim();
        const body = String(formData.get("body") || "").trim();
        const dueAt = String(formData.get("due_at") || "") || null;
        const topicId = formData.get("topic_id") ? Number(formData.get("topic_id")) : null;
        const maxPoints = formData.get("max_points") ? Number(formData.get("max_points")) : null;
        await createPostAction(studentId, postType, title, body, dueAt, topicId, maxPoints);
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon size={18} className={config.color} />
            {isEdit ? `Edit ${config.label.replace("Post ", "")}` : config.label}
          </DialogTitle>
          <DialogDescription>
            {postType === "assignment"
              ? "Create an assignment with an optional due date."
              : postType === "announcement"
                ? "Post an announcement to this student's classroom."
                : "Share learning materials with this student."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          {isEdit && <input type="hidden" name="id" value={editPost.id} />}
          {isEdit && <input type="hidden" name="type" value={postType} />}
          {isEdit && <input type="hidden" name="student_id" value={studentId} />}

          <div className="space-y-4 py-2">
            <Field
              label="Title"
              name="title"
              placeholder={
                postType === "assignment" ? "e.g., Algebra Worksheet Ch.5"
                  : postType === "announcement" ? "e.g., Schedule Change Notice"
                    : "e.g., Chapter 5 Notes"
              }
              required
              defaultValue={editPost?.title || ""}
            />

            <TextAreaField
              label="Content"
              name="body"
              placeholder="Add details, instructions, or notes..."
              rows={4}
              defaultValue={editPost?.body || ""}
            />

            <TopicSelector
              topics={topics}
              studentId={studentId}
              defaultValue={editPost?.topic_id?.toString() || ""}
            />

            {postType === "assignment" && (
              <>
                <Field
                  label="Points"
                  name="max_points"
                  type="number"
                  placeholder="e.g., 100"
                  defaultValue={editPost?.max_points?.toString() || ""}
                />
                <Field
                  label="Due Date"
                  name="due_at"
                  type="datetime-local"
                  defaultValue={editPost?.due_at?.slice(0, 16) || ""}
                />
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Posting..." : isEdit ? "Save Changes" : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPostButton({ post, studentId, topics = [] }: { post: Post; studentId: number; topics?: Topic[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(true)}>
        <Pencil size={14} />
      </Button>
      <PostDialog
        open={open}
        onOpenChange={setOpen}
        postType={post.type}
        studentId={studentId}
        editPost={post}
        topics={topics}
      />
    </>
  );
}

export function DeletePostButton({ postId, studentId }: { postId: number; studentId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deletePostAction(postId, studentId);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-600" onClick={() => setConfirming(true)}>
        <Trash2 size={14} />
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
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
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState(defaultValue);
  const [localTopics, setLocalTopics] = useState(topics);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createTopic(studentId, newName.trim());
      setNewName("");
      setShowNew(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Topic</label>
      <div className="flex items-center gap-2">
        <select
          name="topic_id"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">No topic</option>
          {localTopics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {!showNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1 text-xs h-9"
            onClick={() => {
              setShowNew(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <Plus size={12} />
            New
          </Button>
        )}
      </div>
      {showNew && (
        <div className="flex items-center gap-2 mt-1">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              if (e.key === "Escape") { setShowNew(false); setNewName(""); }
            }}
            placeholder="New topic name"
            className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isPending}
          />
          <Button type="button" size="icon" variant="ghost" className="size-7" onClick={handleCreate} disabled={isPending || !newName.trim()}>
            <Check size={14} />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => { setShowNew(false); setNewName(""); }}>
            <X size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
