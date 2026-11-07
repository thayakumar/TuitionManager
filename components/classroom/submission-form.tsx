"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAssignment } from "@/lib/actions";

export function SubmissionForm({
  postId,
  studentId,
}: {
  postId: number;
  studentId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  function handleSubmit() {
    if (!content.trim() && !fileUrl.trim()) return;
    const fd = new FormData();
    fd.set("post_id", String(postId));
    fd.set("student_id", String(studentId));
    fd.set("content", content.trim());
    fd.set("file_url", fileUrl.trim());

    startTransition(async () => {
      await submitAssignment(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground">Your work</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Type your answer or paste your work here..."
          className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={isPending}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Link <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="e.g., Google Drive link"
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={isPending}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || (!content.trim() && !fileUrl.trim())}
        className="gap-1.5"
      >
        <Send size={14} />
        {isPending ? "Submitting..." : "Turn in"}
      </Button>
    </div>
  );
}
