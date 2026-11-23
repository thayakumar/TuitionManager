import crypto from "crypto";
export type UploadActor = { admin: boolean; studentId: number | null; parentTokenHash?: string | null };
export const UPLOAD_RECEIPT_COOKIE = "tuition_pending_files";
export const actorKey = (actor: UploadActor) =>
  actor.parentTokenHash ? "parent:" + actor.parentTokenHash : actor.admin ? "admin" : "student:" + actor.studentId;
export function signUpload(value: unknown, secret: string): string {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return (
    body +
    "." +
    crypto.createHmac("sha256", secret).update(body).digest("base64url")
  );
}
export function verifyUpload<T>(token: string, secret: string): T | null {
  if (!secret || token.length > 16000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  if (!body || !mac) return null;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  if (
    expected.length !== mac.length ||
    !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  )
    return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
export type UploadTicket = {
  fileId: string;
  actor: string;
  expires: number;
  uploadUrl?: string;
  size?: number;
  mimeType?: string;
};
export function ticketAllows(
  ticket: UploadTicket | null,
  actor: UploadActor,
  fileId: string,
): boolean {
  return (
    !!ticket &&
    ticket.actor === actorKey(actor) &&
    ticket.fileId === fileId &&
    ticket.expires > Date.now()
  );
}
export function pendingFiles(headers: Headers, secret: string): UploadTicket[] {
  const value = headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(UPLOAD_RECEIPT_COOKIE + "="))
    ?.slice(UPLOAD_RECEIPT_COOKIE.length + 1);
  const parsed = value ? verifyUpload<unknown>(value, secret) : null;
  // A signed resumable-session object is not a receipt list. Signatures prove
  // integrity, not the shape/purpose of arbitrary cookie input.
  return Array.isArray(parsed) ? parsed.filter((ticket): ticket is UploadTicket =>
    !!ticket && typeof ticket === "object" &&
    typeof ticket.fileId === "string" && /^[A-Za-z0-9_-]{10,}$/.test(ticket.fileId) &&
    typeof ticket.actor === "string" &&
    typeof ticket.expires === "number" && Number.isFinite(ticket.expires)
  ) : [];
}
export function receiptHeader(tickets: UploadTicket[], secret: string): string {
  return (
    UPLOAD_RECEIPT_COOKIE +
    "=" +
    signUpload(tickets.slice(-12), secret) +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400" +
    (process.env.NODE_ENV === "production" ? "; Secure" : "")
  );
}
