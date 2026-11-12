"use client";

import { useState, useMemo } from "react";
import { Search, Trash2, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.content.toLowerCase().includes(q) ||
        new Date(n.created_at).toLocaleDateString().includes(q) ||
        new Date(n.created_at).toLocaleString().includes(q)
    );
  }, [notes, search]);

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
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes by date or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No notes match your search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">Date</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => {
                const isExpanded = expandedId === n.id;
                const isLong = n.content.length > 120;
                return (
                  <tr
                    key={n.id}
                    className="border-b border-border/50 hover:bg-violet-50/30 transition-colors cursor-pointer group"
                    onClick={() => setExpandedId(isExpanded ? null : n.id)}
                  >
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap align-top">
                      {new Date(n.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-foreground align-top">
                      <div className={isExpanded || !isLong ? "whitespace-pre-wrap" : "line-clamp-2"}>
                        {n.content}
                      </div>
                      {isLong && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-indigo-500 mt-1">
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {isExpanded ? "Show less" : "Show more"}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <form
                        action={() => deleteAction(n.id, studentId)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          title="Delete note"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 h-7 w-7 p-0"
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
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        {filtered.length} of {notes.length} notes
      </p>
    </div>
  );
}
