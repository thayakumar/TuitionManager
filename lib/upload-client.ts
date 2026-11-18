import { ActionValidationError } from "./action-errors";
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
class UploadFailure extends ActionValidationError {
  constructor(
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}
export async function uploadFile(
  file: File,
  { onProgress, role: requestedRole, parentToken }: { onProgress?: (percent: number) => void; role?: "admin" | "student" | "parent"; parentToken?: string } = {},
): Promise<UploadedFile> {
  if (!file.size) throw new ActionValidationError("Choose a non-empty file.");
  if (!isSupportedUpload(file))
    throw new ActionValidationError(
      "Choose a supported document, image, audio, video or archive.",
    );
  const role = requestedRole ?? (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/portal/student/")
      ? "student"
      : "admin");
  const jsonHeaders = {
    "Content-Type": "application/json",
    "X-Upload-Role": role,
    ...(parentToken ? { "X-Parent-Token": parentToken } : {}),
  };
  const mime = uploadMime(file) || file.type || "application/octet-stream";
  onProgress?.(0);
  const begin = await fetch("/api/upload", {
    method: "POST",
    headers: jsonHeaders,
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
      throw new ActionValidationError(
        session.error || "Could not start this upload.",
      );
    if (file.size > LEGACY_UPLOAD_BYTES)
      throw new ActionValidationError(
        "Your Drive connector needs its one-time upgrade before larger files can upload. Open Settings → File storage. Your file has not been uploaded.",
      );
    const body = new FormData();
    body.set("file", file);
    const r = await fetch("/api/upload", {
        method: "POST",
        headers: { "X-Upload-Role": role, ...(parentToken ? { "X-Parent-Token": parentToken } : {}) },
        body,
      }),
      result = await r.json();
    if (!r.ok || !result.fileUrl)
      throw new ActionValidationError(result.error || "Upload failed.");
    onProgress?.(100);
    return {
      ...result,
      fileName: result.fileName || file.name,
      fileType: mime,
    };
  }
  async function transfer(
    range: string,
    body?: Blob,
  ): Promise<{ complete: boolean; nextOffset: number }> {
    let response: Response;
    try {
      response = await fetch("/api/upload/chunk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Upload-Ticket": session.ticket,
          ...(parentToken ? { "X-Parent-Token": parentToken } : {}),
          "Content-Range": range,
        },
        body,
      });
    } catch {
      throw new UploadFailure(
        "The connection to the app was interrupted. Your file is still selected; retry.",
        true,
      );
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new UploadFailure(
        "The upload service returned an unreadable response. Retry.",
        response.status >= 500,
      );
    }
    if (!response.ok)
      throw new UploadFailure(
        result.error || "Could not upload this file.",
        !!result.retryable,
      );
    if (
      !Number.isSafeInteger(result.nextOffset) ||
      result.nextOffset < 0 ||
      result.nextOffset > file.size
    )
      throw new UploadFailure(
        "The upload service returned an invalid file position.",
      );
    return result;
  }
  let offset = 0,
    retries = 0;
  while (offset < file.size) {
    const end = Math.min(offset + 2 * 1024 * 1024, file.size);
    try {
      const result = await transfer(
        "bytes " + offset + "-" + (end - 1) + "/" + file.size,
        file.slice(offset, end),
      );
      if (result.complete) {
        offset = file.size;
        break;
      }
      if (result.nextOffset <= offset)
        throw new UploadFailure(
          "Drive has not acknowledged this chunk yet.",
          true,
        );
      offset = result.nextOffset;
      retries = 0;
      onProgress?.(Math.min(99, Math.round((offset / file.size) * 100)));
    } catch (error) {
      if (
        !(error instanceof UploadFailure) ||
        !error.retryable ||
        ++retries > 3
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 200 * retries));
      try {
        const status = await transfer("bytes */" + file.size);
        if (status.complete) {
          offset = file.size;
          break;
        }
        offset = status.nextOffset;
      } catch (probeError) {
        if (probeError instanceof UploadFailure && !probeError.retryable)
          throw probeError;
      }
    }
  }
  const finish = await fetch("/api/upload", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        action: "finish",
        ticket: session.ticket,
        fileName: file.name,
      }),
    }),
    result = await finish.json();
  if (!finish.ok || !result.fileUrl)
    throw new ActionValidationError(
      result.error ||
        "Drive received the file but could not finish registering it. Keep this page open and retry.",
    );
  onProgress?.(100);
  return { ...result, fileName: result.fileName || file.name, fileType: mime };
}
