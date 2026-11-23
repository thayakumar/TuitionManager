import { verifyAdminSession, getStudentSession } from "@/lib/auth";
import { parentUploadIdentity } from "@/lib/parent-upload";
import { execute } from "@/lib/db";
import { driveFileId } from "@/lib/attachment-url";
import { uploadMime } from "@/lib/upload-limits";
import { actorKey, pendingFiles, receiptHeader, signUpload, ticketAllows, uploadTicket, type UploadActor, type UploadTicket } from "@/lib/upload-authority";
import type { storageFile } from "@/lib/storage-response";

/** Trusted host comes from the deployment proxy, matching the existing upload routes. */
export function uploadOrigin(request: Request, required = false): "invalid" | "denied" | null {
  const origin = request.headers.get("origin");
  if (!origin) return required ? "denied" : null;
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host") || new URL(request.url).host;
  try { return new URL(origin).host === host ? null : "denied"; }
  catch { return "invalid"; }
}

/** Explicit parent/student views override simultaneous administrator cookies.
 * Chunks without an explicit view retain the account selected by their ticket. */
export async function currentUploadActor(request: Request, ticket?: UploadTicket): Promise<UploadActor | null> {
  const [admin, studentId] = await Promise.all([verifyAdminSession(), getStudentSession()]);
  const role = request.headers.get("x-upload-role") || (ticket?.actor.startsWith("parent:") ? "parent" : ticket?.actor.startsWith("student:") ? "student" : undefined);
  if (role === "parent") {
    const parent = await parentUploadIdentity(request.headers.get("x-parent-token"));
    return parent ? { admin: false, studentId: parent.studentId, parentTokenHash: parent.parentTokenHash } : null;
  }
  if (role !== "student" && admin) return { admin: true, studentId: null };
  return studentId ? { admin: false, studentId } : null;
}

export function googleUploadTarget(value: string): URL {
  const target = new URL(value);
  if (target.protocol !== "https:" || target.username || target.password || !["www.googleapis.com", "content.googleapis.com"].includes(target.hostname) || !target.pathname.startsWith("/upload/drive/"))
    throw new Error("Drive returned an invalid upload session");
  return target;
}

export async function currentUploadSession(request: Request, token: string, secret: string) {
  const ticket = secret ? uploadTicket(token, secret) : null;
  if (!ticket || !ticket.uploadUrl || !ticket.size || ticket.expires <= Date.now())
    return { error: "expired" } as const;
  const actor = await currentUploadActor(request, ticket);
  if (!actor || !ticketAllows(ticket, actor, ticket.fileId)) return { error: "actor" } as const;
  if (uploadOrigin(request, true)) return { error: "origin" } as const;
  try { return { ticket, target: googleUploadTarget(ticket.uploadUrl) } as const; }
  catch { return { error: "target" } as const; }
}

/** A request-scoped authority keeps session identity, terminal identity, registry and
 * pending receipts together; transport byte handling stays in each real adapter. */
export function attachmentTransfer(request: Request, actor: UploadActor, secret: string) {
  return {
    begin(session: { fileId: string; uploadUrl: string; size: number; mimeType: string }) {
      const target = googleUploadTarget(session.uploadUrl);
      const ticket: UploadTicket = { ...session, uploadUrl: target.href, actor: actorKey(actor), expires: Date.now() + 86400000 };
      return { uploadUrl: target.href, ticket: signUpload(ticket, secret) };
    },
    ticket(token: string) {
      const ticket = uploadTicket(token, secret);
      return ticket && ticketAllows(ticket, actor, ticket.fileId) ? ticket : null;
    },
    async complete(result: ReturnType<typeof storageFile>, fallback: string, expectedFileId?: string) {
      const fileId = result.fileId || driveFileId(result.fileUrl);
      if (expectedFileId && fileId !== expectedFileId)
        throw new Error("Drive returned a different file from the upload session");
      const fileName = result.fileName || fallback;
      if (fileId) await execute(
        "INSERT OR IGNORE INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,mime_type,parent_token_hash) VALUES(?,?,?,?,?,?)",
        [fileId, actor.admin ? "admin" : "student", actor.studentId, fileName, uploadMime({ name: fileName, type: result.fileType || "" }) || "", actor.parentTokenHash ?? null],
      );
      const tickets = secret && fileId ? pendingFiles(request.headers, secret).filter(t => t.expires > Date.now() && t.fileId !== fileId) : [];
      if (fileId && secret) tickets.push({ fileId, actor: actorKey(actor), expires: Date.now() + 86400000 });
      return {
        body: { ...result, fileName, ...(fileId ? { inlineUrl: "/api/files/" + fileId + "?inline=1" + (actor.parentTokenHash ? "&parent_token=" + encodeURIComponent(request.headers.get("x-parent-token") || "") : "") } : {}) },
        receipt: fileId && secret ? receiptHeader(tickets, secret) : null,
      };
    },
  };
}
