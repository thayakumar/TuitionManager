// Leave room for multipart metadata beneath Vercel's 4.5 MB request limit.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";

// Files are stored in Drive and opened as external attachments, never served as app HTML.
const MATERIAL_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  txt: "text/plain",
  csv: "text/csv",
  rtf: "application/rtf",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  zip: "application/zip",
  "7z": "application/x-7z-compressed",
};
export const SUPPORTED_UPLOAD_ACCEPT = Object.keys(MATERIAL_TYPES)
  .map((ext) => "." + ext)
  .join(",");
export function uploadMime(file: {
  name: string;
  type: string;
}): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return MATERIAL_TYPES[extension] || null;
}
export function isSupportedUpload(file: {
  name: string;
  type: string;
}): boolean {
  return uploadMime(file) !== null;
}
