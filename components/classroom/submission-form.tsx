"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitAssignmentResult as submitAssignment } from "@/lib/actions";
import { actionError, ActionValidationError } from "@/lib/action-errors";
import { safeUrl } from "@/lib/domain/validation";

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload-limits";
const MAX_FILE_SIZE = MAX_UPLOAD_BYTES;

export function SubmissionForm({
  postId,
  studentId,
  studentName,
  resubmission = false,
}: {
  postId: number;
  studentId: number;
  studentName?: string;
  resubmission?: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    setError("");
    setFile(null);
    if (!next) return;
    if (next.size === 0 || next.size > MAX_FILE_SIZE) {
      setError(`Choose a nonempty image or PDF up to ${MAX_UPLOAD_LABEL}.`);
      event.target.value = "";
      return;
    }
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "application/pdf",
      ].includes(next.type)
    ) {
      setError("Use a PNG, JPG, WebP, GIF or PDF file.");
      event.target.value = "";
      return;
    }
    setFile(next);
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    let link: string | null;
    try {
      link = safeUrl(fileUrl);
    } catch {
      setError("Enter a complete HTTPS link without embedded credentials.");
      return;
    }
    if (!content.trim() && !link && !file) {
      setError("Add your work, a file, or a valid link before turning in.");
      return;
    }
    if (file && link) {
      setError("Choose either an attached file or a link for this attempt.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (file) {
        const body = new FormData();
        body.set("file", file);
        body.set("studentName", studentName || "student");
        const response = await fetch("/api/upload", { method: "POST", body });
        const result = await response.json();
        if (!response.ok || !result.fileUrl)
          throw new ActionValidationError(
            result.error || "Upload failed. Your work has not been submitted.",
          );
        link = safeUrl(result.fileUrl);
        if (!link)
          throw new ActionValidationError(
            "Upload did not return a valid attachment link.",
          );
        // Retain the successful upload if the later submission write fails.
        setFileUrl(link);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
      const data = new FormData();
      data.set("post_id", String(postId));
      data.set("student_id", String(studentId));
      data.set("content", content.trim());
      data.set("file_url", link ?? "");
      const result = await submitAssignment(data);
      if (result && !result.success)
        throw new ActionValidationError(
          result.error || "Could not submit this attempt.",
        );
      setContent("");
      setFileUrl("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(resubmission ? "New attempt submitted" : "Work submitted");
      router.refresh();
    } catch (reason) {
      setError(
        actionError(
          reason,
          "Could not submit your work. Your answer is still here; please try again.",
        ),
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {resubmission && (
        <p className="text-sm text-muted-foreground">
          This creates a new attempt awaiting a grade. Earlier work and feedback
          stay in your history.
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor={`work-${postId}`} className="text-sm font-medium">
          Your work
        </label>
        <textarea
          id={`work-${postId}`}
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          maxLength={10000}
          placeholder="Type your answer or paste your work here..."
          disabled={busy}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`file-${postId}`} className="text-sm font-medium">
          Attachment (optional)
        </label>
        <input
          ref={inputRef}
          id={`file-${postId}`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          onChange={selectFile}
          disabled={busy}
          className="block w-full text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Image or PDF, up to {MAX_UPLOAD_LABEL}.
        </p>
        {file && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Remove attachment
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`link-${postId}`} className="text-sm font-medium">
          HTTPS link (optional)
        </label>
        <input
          id={`link-${postId}`}
          type="url"
          name="file_url"
          placeholder="e.g., Google Drive link"
          value={fileUrl}
          onChange={(event) => setFileUrl(event.target.value)}
          maxLength={2048}
          disabled={busy}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy || (!content.trim() && !fileUrl.trim() && !file)}
      >
        {busy
          ? "Submitting..."
          : resubmission
            ? "Submit new attempt"
            : "Turn in"}
      </Button>
    </form>
  );
}
