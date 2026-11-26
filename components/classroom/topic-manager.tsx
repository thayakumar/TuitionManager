"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createTopic, renameTopic, deleteTopic } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";

export function CreateTopicButton({ studentId }: { studentId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createTopic(studentId, name.trim());
      toast.success("Topic created");
      setName("");
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(
        actionError(reason, "Could not create this topic. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Plus size={18} />
        Create topic
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a topic</DialogTitle>
            <DialogDescription>
              Give related classwork a clear home.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-6" aria-busy={busy}>
            <section className="form-section">
              <label className="field-group">
                <span className="field-label">Topic name</span>
                <input
                  required
                  aria-label="Topic name"
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="For example, Fractions or Revision"
                  disabled={busy}
                  className="studio-input"
                />
              </label>
              <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                <BookOpen size={19} className="shrink-0" />
                You can organise materials and assignments under this topic.
              </p>
            </section>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 p-4 text-destructive"
              >
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
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create topic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TopicActions({
  topicId,
  topicName,
  studentId,
}: {
  topicId: number;
  topicName: string;
  studentId: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"rename" | "delete" | null>(null),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(topicName),
    [error, setError] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !mode || (mode === "rename" && !name.trim())) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "rename") {
        if (name.trim() !== topicName)
          await renameTopic(topicId, name.trim(), studentId);
        toast.success("Topic renamed");
      } else {
        await deleteTopic(topicId, studentId);
        toast.success("Topic deleted; its posts are under No topic");
      }
      setMode(null);
      router.refresh();
    } catch (reason) {
      setError(actionError(reason, "Could not update this topic."));
    } finally {
      setBusy(false);
    }
  }
  function start(next: "rename" | "delete") {
    setName(topicName);
    setError("");
    setMode(next);
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Manage topic ${topicName}`}
          >
            <MoreVertical size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => start("rename")}>
            <Pencil size={17} />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => start("delete")}
            className="text-destructive"
          >
            <Trash2 size={17} />
            Delete topic
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={mode !== null}
        onOpenChange={(value) => {
          if (!value && !busy) setMode(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "delete" ? "Delete topic?" : "Rename topic"}
            </DialogTitle>
            <DialogDescription>
              {mode === "delete"
                ? "Remove the organisation, keep the learning history."
                : "Update how this topic appears in classwork."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-6" aria-busy={busy}>
            <section className="form-section">
              {mode === "rename" ? (
                <label className="field-group">
                  <span className="field-label">Topic name</span>
                  <input
                    required
                    aria-label="Rename topic"
                    value={name}
                    maxLength={200}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy}
                    className="studio-input"
                  />
                </label>
              ) : (
                <>
                  <h3 className="form-section-title">{topicName}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    Posts will move to <strong>No topic</strong>. Assignments,
                    submitted work, grades and feedback are preserved.
                  </p>
                </>
              )}
            </section>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 p-4 text-destructive"
              >
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setMode(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={mode === "delete" ? "destructive" : "default"}
                disabled={busy || (mode === "rename" && !name.trim())}
              >
                {busy
                  ? "Saving…"
                  : mode === "delete"
                    ? "Delete topic"
                    : "Save name"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
