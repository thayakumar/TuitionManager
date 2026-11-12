"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { createTopic, renameTopic, deleteTopic } from "@/lib/actions";

export function CreateTopicButton({ studentId }: { studentId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createTopic(studentId, name.trim());
      toast.success("Topic created");
      setName("");
      setShowInput(false);
      router.refresh();
    });
  }

  if (!showInput) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => {
          setShowInput(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <Plus size={14} />
        Create topic
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") { setShowInput(false); setName(""); }
        }}
        placeholder="Topic name"
        className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        disabled={isPending}
      />
      <Button size="icon" variant="ghost" className="size-7" onClick={handleCreate} disabled={isPending || !name.trim()}>
        <Check size={14} />
      </Button>
      <Button size="icon" variant="ghost" className="size-7" onClick={() => { setShowInput(false); setName(""); }}>
        <X size={14} />
      </Button>
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
  const [isPending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(topicName);

  function handleRename() {
    if (!newName.trim() || newName.trim() === topicName) {
      setRenaming(false);
      setNewName(topicName);
      return;
    }
    startTransition(async () => {
      await renameTopic(topicId, newName.trim(), studentId);
      toast.success("Topic renamed");
      setRenaming(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTopic(topicId, studentId);
      toast.success("Topic deleted");
      router.refresh();
    });
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") { setRenaming(false); setNewName(topicName); }
          }}
          className="h-7 rounded-md border border-input bg-transparent px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          autoFocus
          disabled={isPending}
        />
        <Button size="icon" variant="ghost" className="size-6" onClick={handleRename} disabled={isPending}>
          <Check size={12} />
        </Button>
        <Button size="icon" variant="ghost" className="size-6" onClick={() => { setRenaming(false); setNewName(topicName); }}>
          <X size={12} />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
          <MoreVertical size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setRenaming(true)} className="gap-2">
          <Pencil size={14} />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="gap-2 text-red-600 focus:text-red-600">
          <Trash2 size={14} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
