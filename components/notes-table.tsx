"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TableExplorer } from "@/components/table-explorer";
import { RichText } from "@/components/rich-text";
import { richTextPlainText } from "@/lib/rich-text";
import { Trash2, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionBusy } from "@/components/action-busy";
import { actionError } from "@/lib/action-errors";
import { fmtDateTime } from "@/lib/format";
import type { StudentNote } from "@/lib/types";

export function NotesTable({
  notes,
  studentId,
  deleteAction,
}: {
  notes: StudentNote[];
  studentId: number;
  deleteAction: (noteId: number, studentId: number) => Promise<void>;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useActionBusy(busy, "Deleting note…");

  async function confirmDelete() {
    if (deletingId === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAction(deletingId, studentId);
      setDeletingId(null);
      router.refresh();
    } catch (reason) {
      setError(actionError(reason, "Could not delete this note."));
    } finally {
      setBusy(false);
    }
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <MessageSquare size={32} className="mx-auto mb-2 opacity-40" aria-hidden="true" />
        <p className="text-sm">No notes yet</p>
      </div>
    );
  }

  return (
    <div>
      <TableExplorer label="notes">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">
                Date
              </th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Note
              </th>
              <th className="w-12 py-2.5 px-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => {
              const isExpanded = expandedId === n.id;
              const isLong = richTextPlainText(n.content).length > 120;
              return (
                <tr
                  key={n.id}
                  className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                >
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap align-top">
                    {fmtDateTime(n.created_at)}
                  </td>
                  <td className="py-2.5 px-3 text-foreground align-top">
                    <div
                      className={
                        isExpanded || !isLong
                          ? "whitespace-pre-wrap"
                          : "line-clamp-2"
                      }
                    >
                      <RichText content={n.content} />
                    </div>
                    {isLong && (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedId(isExpanded ? null : n.id)}
                        className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} aria-hidden="true" />
                        ) : (
                          <ChevronRight size={14} aria-hidden="true" />
                        )}
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete note"
                      title="Delete note"
                      className="size-10 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setError(null);
                        setDeletingId(n.id);
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableExplorer>

      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDeletingId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>
              This note will be permanently removed from the student&apos;s
              profile.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void confirmDelete()}
            >
              {busy ? "Deleting…" : "Delete note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
