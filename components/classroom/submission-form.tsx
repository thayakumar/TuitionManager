"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Link2,
  Send,
  CheckCircle2,
  X,
} from "lucide-react";
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
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={busy}>
      <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <FileText size={21} className="text-primary" />
          {resubmission ? "Start a new attempt" : "Ready to share your work?"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {resubmission
            ? "Your earlier work and feedback stay in history. This new attempt will wait for a new grade."
            : "Write an answer, attach a file or share a link. You can submit a new attempt later."}
        </p>
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <section className="form-section space-y-3">
          <label
            htmlFor={`work-${postId}`}
            className="form-section-title block"
          >
            Your work
          </label>
          <textarea
            id={`work-${postId}`}
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={6}
            maxLength={10000}
            placeholder="Type your answer or paste your work here…"
            className="w-full rounded-xl border border-input bg-card p-4 text-base leading-relaxed"
          />
        </section>
        <section className="form-section space-y-4">
          <h3 className="form-section-title">Add supporting work</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose a file or a link for this attempt.
          </p>
          <label
            htmlFor={`file-${postId}`}
            className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-orange-50 focus-within:ring-2 focus-within:ring-ring"
          >
            <UploadCloud size={28} className="mb-3 text-primary" />
            <span className="font-medium">
              {file ? file.name : "Choose an image or PDF"}
            </span>
            <span className="mt-1 text-sm text-muted-foreground">
              Up to {MAX_UPLOAD_LABEL}
            </span>
            <input
              ref={inputRef}
              id={`file-${postId}`}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
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
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or add a link
            <span className="h-px flex-1 bg-border" />
          </div>
          <label
            htmlFor={`link-${postId}`}
            className="block text-sm font-medium"
          >
            HTTPS link (optional)
          </label>
          <div className="relative">
            <Link2
              size={19}
              className="pointer-events-none absolute left-4 top-4 text-muted-foreground"
            />
            <input
              id={`link-${postId}`}
              type="url"
              name="file_url"
              placeholder="https://…"
              value={fileUrl}
              onChange={(event) => setFileUrl(event.target.value)}
              maxLength={2048}
              className="min-h-12 w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-base"
            />
          </div>
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
          disabled={busy || (!content.trim() && !fileUrl.trim() && !file)}
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
