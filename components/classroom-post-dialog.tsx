"use client";

import { useState } from "react";
import { BookOpen, ClipboardList, Megaphone, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, TextAreaField } from "@/components/form-field";
import { createPost, updatePost, deletePost } from "@/lib/actions";
import type { Post, PostType } from "@/lib/types";

const POST_TYPES = [
  { value: "material" as PostType, label: "Post Material", icon: BookOpen, color: "text-blue-600" },
  { value: "assignment" as PostType, label: "Post Assignment", icon: ClipboardList, color: "text-amber-600" },
  { value: "announcement" as PostType, label: "Post Announcement", icon: Megaphone, color: "text-emerald-600" },
];

export function ClassroomActions({ studentId }: { studentId: number }) {
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
      />
    </>
  );
}

function PostDialog({
  open, onOpenChange, postType, studentId, editPost,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postType: PostType;
  studentId: number;
  editPost?: Post;
}) {
  const config = POST_TYPES.find((p) => p.value === postType) || POST_TYPES[0];
  const isEdit = !!editPost;

  async function handleSubmit(formData: FormData) {
    if (isEdit) {
      await updatePost(formData);
    } else {
      await createPost(formData);
    }
    onOpenChange(false);
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
          <input type="hidden" name="type" value={postType} />
          <input type="hidden" name="student_id" value={studentId} />

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

            {postType === "assignment" && (
              <Field
                label="Due Date"
                name="due_at"
                type="datetime-local"
                defaultValue={editPost?.due_at?.slice(0, 16) || ""}
              />
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEdit ? "Save Changes" : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPostButton({ post, studentId }: { post: Post; studentId: number }) {
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
      />
    </>
  );
}

export function DeletePostButton({ postId, studentId }: { postId: number; studentId: number }) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    await deletePost(postId, studentId);
    setConfirming(false);
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
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
