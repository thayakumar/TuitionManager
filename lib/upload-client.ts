import {
  uploadMime,
  isSupportedUpload,
  LEGACY_UPLOAD_BYTES,
} from "./upload-limits";
export type UploadedFile = {
  fileUrl: string;
  fileName: string;
  fileType: string;
  inlineUrl?: string;
  warning?: string;
};
export async function uploadFile(
  file: File,
  { onProgress }: { onProgress?: (percent: number) => void } = {},
): Promise<UploadedFile> {
  if (!file.size) throw new Error("Choose a non-empty file.");
  if (!isSupportedUpload(file))
    throw new Error(
      "Choose a supported document, image, audio, video or archive.",
    );
  onProgress?.(0);
  const mime = uploadMime(file) || file.type || "application/octet-stream";
  const begin = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "begin",
      fileName: file.name,
      fileType: mime,
      size: file.size,
    }),
  });
  const session = await begin.json();
  if (!begin.ok) {
    if (session.code !== "CONNECTOR_UPGRADE")
      throw new Error(session.error || "Could not start this upload.");
    if (file.size > LEGACY_UPLOAD_BYTES)
      throw new Error(
        "Your Drive connector needs its one-time upgrade before larger files can upload. Ask your tutor to open Settings → File storage. Your file has not been uploaded.",
      );
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const result = await response.json();
    if (!response.ok || !result.fileUrl)
      throw new Error(result.error || "Upload failed.");
    onProgress?.(100);
    return {
      ...result,
      fileName: result.fileName || file.name,
      fileType: mime,
    };
  }
  const chunkSize = 8 * 1024 * 1024;
  let offset = 0,
    retries = 0;
  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    let response: Response;
    try {
      response = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mime,
          "Content-Range":
            "bytes " + offset + "-" + (end - 1) + "/" + file.size,
        },
        body: file.slice(offset, end),
      });
    } catch (error) {
      if (++retries > 3)
        throw new Error(
          "The connection to Drive was interrupted. Keep this file selected and retry. No post or submission was saved.",
        );
      const probe = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: { "Content-Range": "bytes */" + file.size },
        body: new Blob([]),
      });
      const range = probe.headers.get("Range");
      if (probe.status === 308) {
        offset = range ? Number(range.match(/-(\d+)$/)?.[1] || -1) + 1 : 0;
        continue;
      }
      if (probe.ok) {
        offset = file.size;
        break;
      }
      throw error;
    }
    if (response.status === 308) {
      const range = response.headers.get("Range");
      offset = range ? Number(range.match(/-(\d+)$/)?.[1] || -1) + 1 : end;
    } else if (response.ok) offset = file.size;
    else
      throw new Error(
        "Drive could not accept this file (" +
          response.status +
          "). Check available Drive storage and retry.",
      );
    onProgress?.(Math.min(99, Math.round((offset / file.size) * 100)));
  }
  const final = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "finish",
      ticket: session.ticket,
      fileName: file.name,
    }),
  });
  const result = await final.json();
  if (!final.ok || !result.fileUrl)
    throw new Error(
      result.error ||
        "Drive received the file but could not finish registering it. Retry without publishing your post.",
    );
  onProgress?.(100);
  return { ...result, fileName: result.fileName || file.name, fileType: mime };
}
