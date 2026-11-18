import { parentUploadIdentity } from "@/lib/parent-upload";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession, getStudentSession } from "@/lib/auth";
import { getStorageSecret } from "@/lib/storage-config";
import { verifyUpload, type UploadTicket } from "@/lib/upload-authority";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const LIMIT = 2 * 1024 * 1024;
const headers = { "Cache-Control": "private, no-store" };
const failure = (error: string, status: number, retryable = false) =>
  NextResponse.json({ error, retryable }, { status, headers });
export async function PUT(request: NextRequest) {
  const secret = await getStorageSecret();
  const ticket = secret
    ? verifyUpload<UploadTicket>(
        request.headers.get("x-upload-ticket") || "",
        secret,
      )
    : null;
  if (
    !ticket ||
    !ticket.uploadUrl ||
    !ticket.size ||
    ticket.expires <= Date.now()
  )
    return failure(
      "This upload session has expired. Choose the file again to retry.",
      403,
    );
  const [admin, sid] = await Promise.all([
    verifyAdminSession(),
    getStudentSession(),
  ]);
  const parent = ticket.actor.startsWith("parent:") ? await parentUploadIdentity(request.headers.get("x-parent-token")) : null;
  if (
    ticket.actor.startsWith("parent:")
      ? !parent || ticket.actor !== "parent:" + parent.parentTokenHash
      : ticket.actor === "admin"
        ? !admin
        : !sid || ticket.actor !== "student:" + sid
  )
    return failure(
      "Sign in to the same account before retrying this upload.",
      401,
    );
  const origin = request.headers.get("origin"),
    host =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      request.headers.get("host") ||
      new URL(request.url).host;
  try {
    if (!origin || new URL(origin).host !== host)
      return failure("Upload origin is not allowed.", 403);
  } catch {
    return failure("Upload origin is not allowed.", 403);
  }
  let target: URL;
  try {
    target = new URL(ticket.uploadUrl);
    if (
      target.protocol !== "https:" ||
      target.username ||
      target.password ||
      !["www.googleapis.com", "content.googleapis.com"].includes(
        target.hostname,
      ) ||
      !target.pathname.startsWith("/upload/drive/")
    )
      throw new Error();
  } catch {
    return failure(
      "The upload session is invalid. Choose the file again.",
      403,
    );
  }
  const range = request.headers.get("content-range") || "",
    match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range),
    probe = /^bytes \*\/(\d+)$/.exec(range);
  if (!match && !probe) return failure("The upload range is invalid.", 400);
  if (Number(match?.[3] || probe?.[1]) !== ticket.size)
    return failure("The file size changed. Choose the file again.", 400);
  const start = match ? Number(match[1]) : 0,
    end = match ? Number(match[2]) : -1,
    expected = match ? end - start + 1 : 0;
  if (
    match &&
    (!Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      end < start ||
      end >= ticket.size ||
      expected > LIMIT)
  )
    return failure("The upload chunk is invalid or too large.", 413);
  if (Number(request.headers.get("content-length") || 0) > LIMIT)
    return failure("The upload chunk is too large.", 413);
  try {
    const reader = request.body?.getReader(),
      parts: Uint8Array[] = [];
    let size = 0;
    if (reader)
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > LIMIT) {
          await reader.cancel();
          return failure("The upload chunk is too large.", 413);
        }
        parts.push(part.value);
      }
    if (size !== expected)
      return failure("The upload chunk was incomplete. Retry this file.", 400);
    const response = await fetch(target.href, {
      method: "PUT",
      headers: {
        "Content-Type": ticket.mimeType || "application/octet-stream",
        "Content-Range": range,
      },
      body: expected ? Buffer.concat(parts) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
    });
    if (response.status === 308) {
      const received = response.headers.get("range"),
        last = received ? /^bytes=0-(\d+)$/.exec(received) : null,
        nextOffset = last ? Number(last[1]) + 1 : 0;
      if (
        !Number.isSafeInteger(nextOffset) ||
        nextOffset < 0 ||
        nextOffset > ticket.size
      )
        return failure("Drive returned an invalid upload position.", 502);
      return NextResponse.json({ complete: false, nextOffset }, { headers });
    }
    if (response.status === 200 || response.status === 201)
      return NextResponse.json(
        { complete: true, nextOffset: ticket.size },
        { headers },
      );
    if ([404, 410].includes(response.status))
      return failure(
        "Drive's upload session expired. Choose the file again.",
        410,
      );
    if ([429, 500, 502, 503, 504].includes(response.status))
      return failure(
        "Drive is temporarily unavailable. Retrying the upload…",
        503,
        true,
      );
    return failure(
      "Drive rejected this upload (" +
        response.status +
        "). Check Drive storage and connector authorization, then retry.",
      502,
    );
  } catch {
    return failure(
      "The connection to Drive was interrupted. Your post has not been submitted; retry the upload.",
      503,
      true,
    );
  }
}
