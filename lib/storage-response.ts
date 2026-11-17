/** Normalize the connector versions without turning explicit failures into success. */
export function storageFile(data: unknown): {
  fileUrl: string;
  fileName?: string;
} {
  if (!data || typeof data !== "object")
    throw new Error("The storage service returned an empty response.");
  const root = data as Record<string, unknown>;
  if (root.success === false || root.status === "error" || root.error) {
    const message = typeof root.error === "string" ? root.error : "";
    if (/permission|sharing|access denied|not authorized/i.test(message))
      throw new Error(
        "Drive received the file but could not share it. Check the upload connector's Drive permissions before retrying.",
      );
    throw new Error(
      "Drive could not finish saving the attachment. Check the upload connector deployment and permissions.",
    );
  }
  const file =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const fileId = file.fileId ?? file.id;
  const value =
    file.fileUrl ??
    file.url ??
    file.webViewLink ??
    (typeof fileId === "string" && /^[\w-]{10,}$/.test(fileId)
      ? "https://drive.google.com/file/d/" + fileId + "/view"
      : null);
  if (typeof value !== "string")
    throw new Error(
      "Drive did not return an attachment link. Update the upload connector to return fileUrl or fileId.",
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The storage service returned an invalid link.");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("The storage service returned an invalid link.");
  return {
    fileUrl: url.toString(),
    ...(typeof file.fileName === "string" ? { fileName: file.fileName } : {}),
  };
}
