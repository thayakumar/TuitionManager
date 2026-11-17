"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, FileText, Send, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitAssignmentResult as submitAssignment } from "@/lib/actions";
import { actionError, ActionValidationError } from "@/lib/action-errors";
import { safeUrl } from "@/lib/domain/validation";

import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  isSupportedUpload,
  SUPPORTED_UPLOAD_ACCEPT,
} from "@/lib/upload-limits";
import { RichTextEditor } from "@/components/rich-text-editor";
import { hasRichTextContent } from "@/lib/rich-text";
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
      setError(`Choose a nonempty file up to ${MAX_UPLOAD_LABEL}.`);
      event.target.value = "";
      return;
    }
    if (!isSupportedUpload(next)) {
      setError("Choose a supported document, image, audio, video or archive.");
      event.target.value = "";
      return;
    }
    setFileUrl("");
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
    if (!hasRichTextContent(content) && !link && !file) {
      setError("Add your work or a file before turning in.");
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
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={busy}>
      <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <FileText size={21} className="text-primary" />
          {resubmission ? "Start a new attempt" : "Ready to share your work?"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {resubmission
            ? "Your earlier work and feedback stay in history. This new attempt will wait for a new grade."
            : "Write an answer, include links in your work or attach a file. You can submit a new attempt later."}
        </p>
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <section className="form-section space-y-3">
          <RichTextEditor
            label="Your work"
            name="content"
            value={content}
            onChange={setContent}
            disabled={busy}
            placeholder="Type your answer or paste your work here…"
          />
        </section>
        <section className="form-section space-y-4">
          <h3 className="form-section-title">Add supporting work</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Attach supporting work. Add any links directly in your answer.
          </p>
          <label
            htmlFor={`file-${postId}`}
            className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-orange-50 focus-within:ring-2 focus-within:ring-ring"
          >
            <Paperclip size={28} className="mb-3 text-primary" />
            <span className="font-medium">
              {file ? file.name : "Attach a file"}
            </span>
            <span className="mt-1 text-sm text-muted-foreground">
              Up to {MAX_UPLOAD_LABEL}
            </span>
            <input
              ref={inputRef}
              id={`file-${postId}`}
              type="file"
              accept={SUPPORTED_UPLOAD_ACCEPT}
              onChange={selectFile}
              className="sr-only"
            />
          </label>
          {file && (
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary p-3">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <CheckCircle2 size={18} className="shrink-0 text-primary" />
                <span className="break-all">{file.name}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X size={17} />
                Remove attachment
              </Button>
            </div>
          )}
          {fileUrl && !file && (
            <p className="text-sm text-muted-foreground">
              Your attachment is uploaded and ready to submit.
            </p>
          )}
        </section>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-base text-destructive"
        >
          {error}
        </p>
      )}
      <div className="border-t border-border pt-5">
        <Button
          type="submit"
          className="w-full"
          disabled={
            busy || (!hasRichTextContent(content) && !fileUrl.trim() && !file)
          }
        >
          <Send size={19} />
          {busy
            ? "Submitting..."
            : resubmission
              ? "Submit new attempt"
              : "Turn in"}
        </Button>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {busy
            ? "Keep this page open while your work is saved."
            : "Your tutor will be notified when you turn in."}
        </p>
      </div>
    </form>
  );
}
