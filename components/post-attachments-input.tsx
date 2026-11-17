"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  SUPPORTED_UPLOAD_ACCEPT,
  isSupportedUpload,
} from "@/lib/upload-limits";
export type PendingAttachment = {
  fileName: string;
  fileUrl: string;
  fileType: string;
};
export function PostAttachmentsInput({
  value,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  value: PendingAttachment[];
  onChange: (files: PendingAttachment[]) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(files: File[]) {
    if (busy || !files.length) return;
    setError("");
    if (
      files.some(
        (f) => !f.size || f.size > MAX_UPLOAD_BYTES || !isSupportedUpload(f),
      )
    ) {
      setError(
        "Choose supported learning materials up to " +
          MAX_UPLOAD_LABEL +
          " each.",
      );
      return;
    }
    if (value.length + files.length > 10) {
      setError("Attach up to 10 files per post.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    const added = [...value];
    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        const response = await fetch("/api/upload", { method: "POST", body });
        const result = await response.json();
        if (!response.ok || !result.fileUrl)
          throw new Error(
            result.error || "Upload failed. Choose the file again to retry.",
          );
        added.push({
          fileName: result.fileName || file.name,
          fileUrl: result.fileUrl,
          fileType: file.type || "File",
        });
        onChange([...added]);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not attach this file.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="space-y-3 min-w-0">
      <input
        ref={input}
        className="sr-only"
        type="file"
        multiple
        accept={SUPPORTED_UPLOAD_ACCEPT}
        aria-label="Attach learning materials"
        disabled={disabled || busy}
        onChange={(e) => void upload(Array.from(e.target.files || []))}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 font-medium hover:bg-secondary disabled:opacity-50"
      >
        {busy ? (
          <Loader2 size={19} className="animate-spin" />
        ) : (
          <Paperclip size={19} />
        )}
        {busy ? "Attaching…" : "Attach materials"}
      </button>
      <p className="text-sm text-muted-foreground">
        Documents, images, presentations, audio, video and archives ·{" "}
        {MAX_UPLOAD_LABEL} each
      </p>
      {value.map((file, index) => (
        <div
          key={file.fileUrl + index}
          className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3"
        >
          <Paperclip size={17} className="shrink-0" />
          <span className="min-w-0 flex-1 break-all text-sm">
            {file.fileName}
          </span>
          <button
            type="button"
            aria-label={"Remove " + file.fileName}
            disabled={disabled || busy}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <X size={18} />
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
