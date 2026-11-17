"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Paperclip, X, Loader2, FolderOpen } from "lucide-react";
import {
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
  onErrorChange,
  disabled = false,
}: {
  value: PendingAttachment[];
  onChange: (files: PendingAttachment[]) => void;
  onBusyChange: (busy: boolean) => void;
  onErrorChange?: (failed: boolean) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<
    { fileId: string; fileName: string; fileUrl: string; fileType: string }[]
  >([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState("");
  const [driveQuery, setDriveQuery] = useState("");
  async function browseDrive() {
    setDriveOpen(true);
    setDriveLoading(true);
    setDriveError("");
    try {
      const response = await fetch("/api/upload/recent", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not load Drive files");
      setDriveFiles(result.files || []);
    } catch (reason) {
      setDriveError(
        reason instanceof Error ? reason.message : "Could not load Drive files",
      );
    } finally {
      setDriveLoading(false);
    }
  }
  async function reuseDrive(fileId: string) {
    setBusy(true);
    onBusyChange(true);
    setDriveError("");
    try {
      const response = await fetch("/api/upload/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const result = await response.json();
      if (!response.ok || !result.fileUrl)
        throw new Error(result.error || "Could not attach this Drive file");
      onChange([
        ...value,
        {
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          fileType: result.fileType || "File",
        },
      ]);
      onErrorChange?.(false);
      setError("");
      if (result.warning) setWarning(result.warning);
      setDriveOpen(false);
    } catch (reason) {
      setDriveError(
        reason instanceof Error
          ? reason.message
          : "Could not attach this Drive file",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  const [progress, setProgress] = useState(0);
  const [warning, setWarning] = useState("");
  async function upload(files: File[]) {
    if (busy || !files.length) return;
    setError("");
    onErrorChange?.(false);
    if (files.some((f) => !f.size || !isSupportedUpload(f))) {
      setError("Choose a nonempty supported learning material.");
      onErrorChange?.(true);
      return;
    }
    if (value.length + files.length > 10) {
      setError("Attach up to 10 files per post.");
      onErrorChange?.(true);
      return;
    }
    setBusy(true);
    onBusyChange(true);
    const added = [...value];
    try {
      for (const file of files) {
        setProgress(0);
        const result = await uploadFile(file, { onProgress: setProgress });
        if (result.warning) setWarning(result.warning);
        added.push({
          fileName: result.fileName || file.name,
          fileUrl: result.fileUrl,
          fileType: file.type || "File",
        });
        onChange([...added]);
      }
    } catch (reason) {
      onErrorChange?.(true);
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
        {busy ? `Attaching… ${Math.round(progress)}%` : "Attach materials"}
      </button>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void browseDrive()}
        className="ml-0 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 font-medium hover:bg-secondary disabled:opacity-50"
      >
        <FolderOpen size={19} /> Add from Drive
      </button>
      <Dialog
        open={driveOpen}
        onOpenChange={(next) => {
          if (!busy) setDriveOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add from Drive</DialogTitle>
            <DialogDescription>
              Choose a file already uploaded to your classroom storage folder.
            </DialogDescription>
          </DialogHeader>
          <input
            type="search"
            aria-label="Search Drive files"
            placeholder="Search files…"
            value={driveQuery}
            onChange={(event) => setDriveQuery(event.target.value)}
            className="w-full rounded-xl border border-input p-3"
          />
          {driveLoading && <p role="status">Loading files…</p>}
          {driveError && (
            <p role="alert" className="text-sm text-destructive">
              {driveError}
            </p>
          )}
          <div className="max-h-[50dvh] space-y-2 overflow-y-auto">
            {driveFiles
              .filter((file) =>
                file.fileName.toLowerCase().includes(driveQuery.toLowerCase()),
              )
              .map((file) => (
                <button
                  type="button"
                  key={file.fileId}
                  disabled={
                    busy ||
                    value.some((added) => added.fileUrl === file.fileUrl)
                  }
                  onClick={() => void reuseDrive(file.fileId)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left hover:bg-secondary disabled:opacity-50"
                >
                  <Paperclip size={18} className="shrink-0" />
                  <span className="min-w-0 break-all">{file.fileName}</span>
                </button>
              ))}
          </div>
          {!driveLoading && !driveError && !driveFiles.length && (
            <p className="text-sm text-muted-foreground">
              No files were found in this storage folder.
            </p>
          )}
        </DialogContent>
      </Dialog>
      <p className="text-sm text-muted-foreground">
        Documents, images, presentations, audio, video and archives
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
      {warning && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {warning}
        </p>
      )}
      {error && (
        <div className="space-y-2 rounded-xl border border-destructive/20 p-3">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <button
            type="button"
            className="text-sm font-medium underline"
            onClick={() => {
              setError("");
              onErrorChange?.(false);
            }}
          >
            Discard failed upload
          </button>
        </div>
      )}
    </div>
  );
}
