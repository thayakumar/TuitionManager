"use client";
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Paperclip,
  Expand,
  Download,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { attachmentHref, driveFileId } from "@/lib/attachment-url";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function imageAttachment(
  fileName: string,
  fileType?: string | null,
): boolean {
  return (
    /^image\/(?:png|jpe?g|gif|webp|avif)$/i.test(fileType || "") ||
    /\.(?:png|jpe?g|gif|webp|avif)(?:$|[?#])/i.test(fileName)
  );
}
export function ImagePreviewDialog({
  src,
  title,
  downloadUrl,
  onClose,
}: {
  src: string | null;
  title: string;
  downloadUrl?: string | null;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);
  return (
    <Dialog
      open={!!src}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-6xl max-h-[95dvh] overflow-y-auto [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="break-all pr-8">
            {title || "Image preview"}
          </DialogTitle>
          <DialogDescription>Image preview</DialogDescription>
        </DialogHeader>
        <div className="relative flex min-h-40 items-center justify-center overflow-auto rounded-xl bg-slate-50 p-2">
          {src && !loaded && !failed && (
            <p
              role="status"
              className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-50/80"
            >
              <LoaderCircle size={20} className="animate-spin" />
              Loading image…
            </p>
          )}
          {failed ? (
            <p role="alert" className="p-5 text-center text-muted-foreground">
              This image could not be displayed. Try reopening the preview.
            </p>
          ) : (
            src && (
              <img
                src={src}
                alt={title || "Expanded image"}
                className="block max-h-[72dvh] max-w-full object-contain"
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
              />
            )
          )}
        </div>
        {downloadUrl && (
          <div className="flex justify-end">
            <a
              href={downloadUrl}
              download
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 font-medium hover:bg-secondary"
            >
              <Download size={18} />
              Download image
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Images preview in-place. Downloading a material always requires an explicit file action. */
export function AttachmentCard({
  fileUrl,
  fileName = "Submitted attachment",
  fileType,
  className = "",
  submitted = false,
  parentToken,
}: {
  fileUrl: string;
  fileName?: string;
  fileType?: string | null;
  className?: string;
  submitted?: boolean;
  parentToken?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null),
    [inspecting, setInspecting] = useState(false),
    [fileOpen, setFileOpen] = useState(false),
    [pdf, setPdf] = useState(false),
    [pdfLoaded, setPdfLoaded] = useState(false),
    [error, setError] = useState("");
  const probe = useRef<AbortController | null>(null);
  useEffect(() => () => probe.current?.abort(), []);
  const scoped = (url: string | null) => url && parentToken && url.startsWith("/api/files/")
    ? url + (url.includes("?") ? "&" : "?") + "parent_token=" + encodeURIComponent(parentToken)
    : url;
  const href = scoped(attachmentHref(fileUrl)),
    inline = scoped(attachmentHref(fileUrl, true)),
    isImage = imageAttachment(fileName, fileType);
  if (!href)
    return (
      <p className="text-sm text-muted-foreground">
        {fileName}: attachment unavailable.
      </p>
    );
  async function open() {
    if (isImage) {
      setPreview(inline);
      return;
    }
    if (fileType === "application/pdf" || /\.pdf(?:$|[?#])/i.test(fileName)) {
      setPdf(true); setPdfLoaded(false); setFileOpen(true);
      return;
    }
    if (!driveFileId(fileUrl)) {
      setFileOpen(true);
      return;
    }
    if (inspecting) return;
    setError("");
    setFileOpen(true);
    setInspecting(true);
    probe.current?.abort();
    const controller = new AbortController();
    probe.current = controller;
    try {
      const response = await fetch(inline!, { method: "HEAD", signal: controller.signal });
      const mime = response.headers.get("Content-Type") || "";
      await response.body?.cancel();
      if (controller.signal.aborted) return;
      if (!response.ok)
        throw new Error(
          "The attachment could not be opened. Please try again.",
        );
      if (/^application\/pdf\b/i.test(mime)) {
        setPdf(true); setPdfLoaded(false);
      }
      if (/^image\/(?:png|jpeg|gif|webp|avif)\b/i.test(mime)) {
        setFileOpen(false);
        setPreview(inline);
      }
    } catch (reason) {
      // Older public Drive links can redirect to a cross-origin thumbnail.
      // A browser image may display it even when fetch cannot read CORS headers.
      if (reason instanceof TypeError && inline && !controller.signal.aborted) {
        const loaded = await new Promise<boolean>((resolve) => {
          const image = new window.Image();
          const timer = setTimeout(() => finish(false), 8000);
          const abort = () => finish(false);
          const finish = (ok: boolean) => {
            clearTimeout(timer);
            image.onload = null;
            image.onerror = null;
            controller.signal.removeEventListener("abort", abort);
            resolve(ok);
          };
          image.onload = () => finish(true);
          image.onerror = () => finish(false);
          controller.signal.addEventListener("abort", abort, { once: true });
          image.src = inline;
        });
        if (loaded && !controller.signal.aborted) {
          setFileOpen(false);
          setPreview(inline);
          return;
        }
      }
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error && !(reason instanceof TypeError)
            ? reason.message
            : "Could not open this attachment. Check the connection and try again.",
        );
    } finally {
      if (!controller.signal.aborted) setInspecting(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        className={
          "flex min-h-20 w-full min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
          className
        }
        aria-label={(isImage ? "View image: " : "Open attachment: ") + fileName}
      >
        {isImage ? (
          <img
            src={inline || undefined}
            alt=""
            loading="lazy"
            className="h-16 w-20 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            {submitted ? <Paperclip size={23} /> : <FileText size={23} />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <strong className="block break-words text-sm font-semibold">
            {fileName}
          </strong>
          <span className="mt-1 block text-sm text-muted-foreground">
            {isImage
              ? "Click to expand image"
              : submitted
                ? "Open submitted work"
                : "View attachment"}
          </span>
        </span>
        {isImage ? (
          <Expand size={18} className="shrink-0 text-muted-foreground" />
        ) : (
          <ExternalLink size={18} className="shrink-0 text-muted-foreground" />
        )}
      </button>
      <ImagePreviewDialog
        src={preview}
        title={fileName}
        downloadUrl={href}
        onClose={() => setPreview(null)}
      />
      <Dialog
        open={fileOpen}
        onOpenChange={(open) => {
          setFileOpen(open);
          if (!open) {
            probe.current?.abort();
            setInspecting(false);
            setPdf(false); setPdfLoaded(false);
          }
        }}
      >
        <DialogContent className={pdf ? "sm:max-w-6xl max-h-[95dvh] overflow-y-auto [&>*]:min-w-0" : "sm:max-w-xl"}>
          <DialogHeader>
            <DialogTitle className="break-all pr-8">{fileName}</DialogTitle>
            <DialogDescription>
              {submitted ? "Submitted attachment" : "Learning material"}
            </DialogDescription>
          </DialogHeader>
          {pdf && !inspecting && !error ? (
            <div className="relative h-[70dvh] min-h-64 overflow-hidden rounded-xl border border-border bg-slate-50">
              {!pdfLoaded && <p role="status" className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-card p-3"><LoaderCircle size={20} className="animate-spin"/>Opening PDF…</p>}
              <iframe title={"PDF preview: " + fileName} src={inline || undefined} onLoad={() => setPdfLoaded(true)} className="h-full w-full border-0"/>
            </div>
          ) : inspecting ? (
            <p role="status" className="flex items-center gap-2 py-6">
              <LoaderCircle size={20} className="animate-spin" />
              Opening attachment…
            </p>
          ) : error ? (
            <p
              role="alert"
              className="rounded-xl bg-destructive/5 p-4 text-destructive"
            >
              {error}
            </p>
          ) : (
            <p className="text-muted-foreground">
              This material is available as a file.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <a
              href={href}
              download
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 font-medium hover:bg-secondary"
            >
              <Download size={18} />
              Download attachment
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
