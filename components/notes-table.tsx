"use client";

import { FormBusy } from "@/components/action-busy";
import { useState } from "react";
import { TableExplorer } from "@/components/table-explorer";
import { RichText } from "@/components/rich-text";
import { richTextPlainText } from "@/lib/rich-text";
import { Trash2, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (notes.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
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
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => {
              const isExpanded = expandedId === n.id;
              const isLong = richTextPlainText(n.content).length > 120;
              return (
                <tr
                  key={n.id}
                  className="border-b border-border/50 hover:bg-orange-50/30 transition-colors cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : n.id)}
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
                      <span className="inline-flex items-center gap-0.5 text-xs text-orange-500 mt-1">
                        {isExpanded ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                        {isExpanded ? "Show less" : "Show more"}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <form
                      action={() => deleteAction(n.id, studentId)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FormBusy label="Deleting note…" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        title="Delete note"
                        className="text-muted-foreground hover:text-red-500 h-7 w-7 p-0"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableExplorer>
    </div>
  );
}
