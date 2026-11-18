"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  UserRound,
  GraduationCap,
} from "lucide-react";
import { RichText } from "@/components/rich-text";
import { RichTextEditor } from "@/components/rich-text-editor";
import { hasRichTextContent } from "@/lib/rich-text";
import { savePostComment, deletePostComment } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { Button } from "@/components/ui/button";
import { useActionBusy } from "@/components/action-busy";
type Comment = {
  id: number;
  body: string;
  authorName: string;
  profile_photo_url?: string | null;
  created_at: string;
  updated_at: string;
  isOwn: boolean;
  author_role: "admin" | "student";
  canEdit: boolean;
  canDelete: boolean;
};
export function PostComments({
  postId,
  viewerRole = "admin",
}: {
  postId: number;
  viewerRole?: "admin" | "student";
}) {
  const [comments, setComments] = useState<Comment[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState(false),
    [editing, setEditing] = useState<number | null>(null),
    [deleting, setDeleting] = useState<number | null>(null),
    [more, setMore] = useState(false);
  const submitting = useRef(false);
  const commentForm = useRef<HTMLFormElement>(null);
  useActionBusy(busy, "Saving comment…");
  const load = useCallback(
    async (before?: number) => {
      const query = new URLSearchParams();
      if (viewerRole === "student") query.set("viewer", "student");
      if (before) query.set("before", String(before));
      const response = await fetch(
        "/api/classroom/posts/" +
          postId +
          "/comments" +
          (query.size ? "?" + query.toString() : ""),
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load comments");
      setComments((old) =>
        before ? [...data.comments, ...old] : data.comments,
      );
      setMore(data.hasMore);
    },
    [postId, viewerRole],
  );
  useEffect(() => {
    let current = true;
    setLoading(true);
    void load()
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      submitting.current ||
      uploading ||
      uploadError ||
      !hasRichTextContent(body)
    )
      return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await savePostComment(
        postId,
        body,
        editing ?? undefined,
        viewerRole === "student",
      );
      setBody("");
      setEditing(null);
      await load();
    } catch (e) {
      setError(
        actionError(
          e,
          "Could not save your comment. Your draft is still here.",
        ),
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function remove(id: number) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await deletePostComment(postId, id, viewerRole === "student");
      setDeleting(null);
      await load();
    } catch (e) {
      setError(actionError(e, "Could not delete this comment."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-8 min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-7"
      aria-label="Class comments"
    >
      <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold">
        <MessageSquare size={23} />
        Class comments
      </h2>
      {loading && (
        <p role="status" className="text-muted-foreground">
          Loading comments…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-destructive/5 p-4 text-destructive"
        >
          {error}{" "}
          <button
            type="button"
            onClick={() =>
              void load()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
            }
            className="underline"
          >
            Retry
          </button>
        </p>
      )}
      {more && (
        <Button
          type="button"
          variant="outline"
          className="mb-4"
          onClick={() =>
            void load(comments[0]?.id).catch((e) => setError(e.message))
          }
        >
          Load older comments
        </Button>
      )}
      {!loading && !comments.length && (
        <p className="mb-5 text-muted-foreground">Start the conversation.</p>
      )}
      <div
        className="space-y-5 rounded-2xl bg-slate-50/60 p-3 sm:p-5"
        aria-label="Comment conversation"
      >
        {comments.map((c) => (
          <article
            key={c.id}
            data-message-side={c.isOwn ? "right" : "left"}
            data-comment-id={c.id}
            className={
              "flex items-end gap-2 sm:gap-3 " +
              (c.isOwn ? "flex-row-reverse" : "flex-row")
            }
          >
            <span
              role="img"
              aria-label={c.isOwn ? "Your profile" : c.authorName + " profile"}
              className={
                "flex size-9 shrink-0 items-center justify-center rounded-full border bg-card " +
                (c.author_role === "admin"
                  ? "border-orange-200 text-orange-700"
                  : "border-blue-200 text-blue-700")
              }
            >
              {c.profile_photo_url && c.author_role === "student" ? (
                <img src={c.profile_photo_url} alt="" className="size-full rounded-full object-cover" />
              ) : c.author_role === "admin" ? (
                <GraduationCap size={18} />
              ) : (
                <UserRound size={18} />
              )}
            </span>
            <div
              className={
                "min-w-0 max-w-[calc(100%_-_44px)] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-[80%] " +
                (c.isOwn
                  ? "rounded-br-md border-orange-200 bg-orange-50"
                  : "rounded-bl-md border-slate-200 bg-white")
              }
            >
              <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">
                  {c.isOwn ? "You" : c.authorName}
                </strong>
                <div className="flex items-center gap-1">
                  {c.canEdit && (
                    <button
                      type="button"
                      aria-label="Edit comment"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setEditing(c.id);
                        setBody(c.body);
                        setDeleting(null);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {c.canDelete && (
                    <button
                      type="button"
                      aria-label="Delete comment"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setDeleting(c.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </header>
              <RichText content={c.body} />
              <p className="mt-2 text-right text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en-MY", {
                  timeZone: "Asia/Kuala_Lumpur",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(c.created_at))}
                {c.updated_at !== c.created_at ? " · Edited" : ""}
              </p>
              {deleting === c.id && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  <span className="text-sm">Delete this comment?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => void remove(c.id)}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleting(null)}
                  >
                    Keep comment
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      <form ref={commentForm} onSubmit={submit} className="mt-6 space-y-3">
        <RichTextEditor
          compact
          onSend={() => commentForm.current?.requestSubmit()}
          label={editing ? "Edit your comment" : "Add class comment"}
          value={body}
          onChange={setBody}
          disabled={busy}
          onBusyChange={setUploading}
          onUploadErrorChange={setUploadError}
          placeholder="Add a class comment…"
        />
        <div className="flex flex-wrap justify-end gap-3">
          {editing && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setBody("");
              }}
            >
              Cancel edit
            </Button>
          )}
          <Button
            type="submit"
            disabled={
              busy || uploading || uploadError || !hasRichTextContent(body)
            }
          >
            <Send size={17} />
            {busy ? "Posting…" : editing ? "Save comment" : "Post comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
