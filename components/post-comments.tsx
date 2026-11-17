"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Pencil, Trash2 } from "lucide-react";
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
  created_at: string;
  updated_at: string;
  canEdit: boolean;
  canDelete: boolean;
};
export function PostComments({ postId }: { postId: number }) {
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
  useActionBusy(busy, "Saving comment…");
  const load = useCallback(
    async (before?: number) => {
      const response = await fetch(
        "/api/classroom/posts/" +
          postId +
          "/comments" +
          (before ? "?before=" + before : ""),
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
    [postId],
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
      await savePostComment(postId, body, editing ?? undefined);
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
      await deletePostComment(postId, id);
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
      <div className="space-y-5">
        {comments.map((c) => (
          <article key={c.id} className="border-b border-border/60 pb-5">
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>{c.authorName}</strong>
                <span className="ml-3 text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("en-MY", {
                    timeZone: "Asia/Kuala_Lumpur",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(c.created_at))}
                  {c.updated_at !== c.created_at ? " · Edited" : ""}
                </span>
              </div>
              <div className="flex gap-1">
                {c.canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit comment"
                    onClick={() => {
                      setEditing(c.id);
                      setBody(c.body);
                      setDeleting(null);
                    }}
                  >
                    <Pencil size={16} />
                  </Button>
                )}
                {c.canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete comment"
                    onClick={() => setDeleting(c.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </header>
            <RichText content={c.body} />
            {deleting === c.id && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span>Delete this comment?</span>
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
          </article>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <RichTextEditor
          compact
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
