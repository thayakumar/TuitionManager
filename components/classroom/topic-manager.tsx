"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Pencil, Trash2, Check, X } from "lucide-react";
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
  const [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function create() {
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
  if (!open)
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          setTimeout(() => input.current?.focus(), 0);
        }}
      >
        <Plus size={14} />
        Create topic
      </Button>
    );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          aria-label="Topic name"
          value={name}
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void create();
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Topic name"
          disabled={busy}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <Button
          type="button"
          aria-label="Create topic"
          onClick={create}
          disabled={busy || !name.trim()}
        >
          <Check size={16} />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="Cancel new topic"
          onClick={() => {
            setOpen(false);
            setName("");
          }}
          disabled={busy}
        >
          <X size={16} />
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
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
  const [busy, setBusy] = useState(false),
    [renaming, setRenaming] = useState(false),
    [name, setName] = useState(topicName),
    [confirming, setConfirming] = useState(false),
    [error, setError] = useState("");
  async function rename() {
    if (busy || !name.trim()) return;
    if (name.trim() === topicName) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await renameTopic(topicId, name.trim(), studentId);
      toast.success("Topic renamed");
      setRenaming(false);
      router.refresh();
    } catch (reason) {
      setError(actionError(reason, "Could not rename this topic."));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteTopic(topicId, studentId);
      toast.success("Topic deleted; its posts are under No topic");
      setConfirming(false);
      router.refresh();
    } catch (reason) {
      setError(actionError(reason, "Could not delete this topic."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      {renaming ? (
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Rename topic"
            value={name}
            maxLength={200}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void rename();
              }
              if (event.key === "Escape") setRenaming(false);
            }}
            autoFocus
            disabled={busy}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <Button
            type="button"
            aria-label="Save topic name"
            disabled={busy || !name.trim()}
            onClick={rename}
          >
            <Check size={14} />
          </Button>
          <Button
            type="button"
            aria-label="Cancel topic rename"
            disabled={busy}
            variant="outline"
            onClick={() => setRenaming(false)}
          >
            <X size={14} />
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Manage topic ${topicName}`}
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setName(topicName);
                setRenaming(true);
              }}
            >
              <Pencil size={14} />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirming(true)}
              className="text-destructive"
            >
              <Trash2 size={14} />
              Delete topic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {error && !confirming && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={confirming}
        onOpenChange={(next) => {
          if (!busy) setConfirming(next);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete topic?</DialogTitle>
            <DialogDescription>
              Posts and submission history will be kept under No topic.
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
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={remove}
            >
              {busy ? "Deleting..." : "Delete topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
