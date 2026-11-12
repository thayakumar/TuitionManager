"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAssignment } from "@/lib/actions";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function SubmissionForm({
  postId,
  studentId,
  studentName,
}: {
  postId: number;
  studentId: number;
  studentName?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large (max 10MB)");
      return;
    }

    setSelectedFile(file);
  }

  function removeFile() {
    setSelectedFile(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadFile(): Promise<string | null> {
    if (!selectedFile) return null;
    setUploading(true);
    setUploadError("");

    try {
      const fd = new FormData();
      fd.set("file", selectedFile);
      fd.set("studentName", studentName || "student");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data.fileUrl) {
        setUploadError(data.error || "Upload failed");
        return null;
      }

      return data.fileUrl;
    } catch {
      setUploadError("Upload failed — try again");
      return null;
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!content.trim() && !fileUrl.trim() && !selectedFile) return;

    startTransition(async () => {
      let finalFileUrl = fileUrl.trim();

      if (selectedFile) {
        const uploadedUrl = await uploadFile();
        if (!uploadedUrl) return;
        finalFileUrl = uploadedUrl;
      }

      const fd = new FormData();
      fd.set("post_id", String(postId));
      fd.set("student_id", String(studentId));
      fd.set("content", content.trim());
      fd.set("file_url", finalFileUrl);

      await submitAssignment(fd);
      router.refresh();
    });
  }

  const isFileIcon = selectedFile?.type.startsWith("image/") ? ImageIcon : FileText;
  const FileIcon = isFileIcon;

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
          disabled={isPending || uploading}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Attachment <span className="text-muted-foreground font-normal">(optional)</span>
        </label>

        {selectedFile ? (
          <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3 py-2">
            <FileIcon size={16} className="text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={removeFile}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending || uploading}
              className="gap-1.5"
            >
              <Paperclip size={14} />
              Attach file
            </Button>
            <span className="text-xs text-muted-foreground self-center">
              Images or PDF, max 10MB
            </span>
          </div>
        )}

        {uploadError && (
          <p className="mt-1 text-xs text-red-500">{uploadError}</p>
        )}
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
          disabled={isPending || uploading}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || uploading || (!content.trim() && !fileUrl.trim() && !selectedFile)}
        className="gap-1.5"
      >
        {uploading ? (
          <><Loader2 size={14} className="animate-spin" /> Uploading...</>
        ) : isPending ? (
          <><Loader2 size={14} className="animate-spin" /> Submitting...</>
        ) : (
          <><Send size={14} /> Turn in</>
        )}
      </Button>
    </div>
  );
}
