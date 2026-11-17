import { NextRequest, NextResponse } from "next/server";
import { getStudentSession, verifyAdminSession } from "@/lib/auth";
import { queryOne, queryAll } from "@/lib/db";
import { driveFileId } from "@/lib/attachment-url";
import { getStorageSecret } from "@/lib/storage-config";
import { actorKey, pendingFiles, ticketAllows } from "@/lib/upload-authority";
class LegacyConnectorError extends Error {}
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const id = (await params).fileId;
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id))
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404, headers },
    );
  const admin = await verifyAdminSession(),
    sid = admin ? null : await getStudentSession();
  if (!admin && !sid)
    return NextResponse.json(
      { error: "Sign in to open this attachment" },
      { status: 401, headers },
    );
  const actor = { admin, studentId: sid },
    secret = await getStorageSecret();
  const metadata = await queryOne<{
    owner_role: string;
    owner_student_id: number | null;
  }>("SELECT owner_role,owner_student_id FROM uploaded_files WHERE file_id=?", [
    id,
  ]);
  const ownsUpload =
    !!metadata &&
    metadata.owner_role === "student" &&
    metadata.owner_student_id === sid;
  const pending =
    secret &&
    pendingFiles(request.headers, secret).some((ticket) =>
      ticketAllows(ticket, actor, id),
    );
  let shared = false;
  if (!admin && !ownsUpload && !pending) {
    // Only tutor-authored records can grant access to a tutor-owned file. A
    // student's arbitrary pasted ID in their submission is never authority.
    const candidates = await queryAll<{ file_url: string }>(
      "SELECT a.file_url FROM post_attachments a JOIN posts p ON p.id=a.post_id WHERE p.student_id=? AND instr(a.file_url,?)>0",
      [sid, id],
    );
    const attached = candidates.some(
      (file) => driveFileId(file.file_url) === id,
    );
    const post = await queryOne(
      "SELECT id FROM posts WHERE student_id=? AND (instr(COALESCE(body,''),?)>0 OR instr(COALESCE(body,''),?)>0) LIMIT 1",
      [sid, "/api/files/" + id + "?", "/d/" + id + "/"],
    );
    shared = !!attached || !!post;
    // Comments are introduced by schema 5; query only if migration contains it.
    const comments = await queryOne(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='post_comments'",
    );
    if (!shared && comments) {
      const comment = await queryOne(
        "SELECT pc.id FROM post_comments pc JOIN posts p ON p.id=pc.post_id WHERE p.student_id=? AND pc.author_role='admin' AND instr(pc.body,?)>0 LIMIT 1",
        [sid, "/api/files/" + id + "?"],
      );
      shared = !!comment;
    }
    if (!shared && !metadata) {
      const legacyAttempts = await queryAll<{ file_url: string }>(
        "SELECT file_url FROM submissions WHERE student_id=? AND instr(COALESCE(file_url,''),?)>0 UNION SELECT v.file_url FROM submission_versions v JOIN submissions s ON s.id=v.submission_id WHERE s.student_id=? AND instr(COALESCE(v.file_url,''),?)>0",
        [sid, id, sid, id],
      );
      if (legacyAttempts.some((file) => driveFileId(file.file_url) === id))
        return NextResponse.redirect(
          "https://drive.google.com/file/d/" + id + "/view",
        );
    }
    if (!shared)
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404, headers },
      );
  }
  const original = "https://drive.google.com/file/d/" + id + "/view";
  if (!secret || !process.env.APPS_SCRIPT_UPLOAD_URL)
    return NextResponse.redirect(
      request.nextUrl.searchParams.get("inline") === "1"
        ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w2000"
        : original,
    );
  const connector = process.env.APPS_SCRIPT_UPLOAD_URL;
  async function read(offset: number) {
    const r = await fetch(connector!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "read",
        secret,
        fileId: id,
        offset,
        length: 512 * 1024,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json();
    if (data.version !== 2) throw new LegacyConnectorError();
    if (!r.ok || !data.success || typeof data.base64 !== "string")
      throw new Error(
        "Drive could not read the attachment. Update the connector in Settings → File storage.",
      );
    return data as {
      base64: string;
      total: number;
      fileName: string;
      mimeType: string;
      nextOffset: number;
    };
  }
  try {
    const first = await read(0);
    let next = first.nextOffset;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Buffer.from(first.base64, "base64"));
      },
      async pull(controller) {
        if (next >= first.total) {
          controller.close();
          return;
        }
        try {
          const part = await read(next);
          if (part.nextOffset <= next)
            throw new Error("Drive returned an incomplete file");
          next = part.nextOffset;
          controller.enqueue(Buffer.from(part.base64, "base64"));
        } catch (error) {
          controller.error(error);
        }
      },
    });
    const inline =
      request.nextUrl.searchParams.get("inline") === "1" &&
      /^image\/(png|jpeg|gif|webp)$/.test(first.mimeType);
    const name = (first.fileName || "Attachment").replace(/[\r\n\"]/g, "_");
    return new Response(stream, {
      headers: {
        ...headers,
        "Content-Type": inline ? first.mimeType : "application/octet-stream",
        "Content-Disposition":
          (inline ? "inline" : "attachment") +
          "; filename*=UTF-8''" +
          encodeURIComponent(name),
        "Content-Length": String(first.total),
      },
    });
  } catch (error) {
    if (error instanceof LegacyConnectorError)
      return NextResponse.redirect(
        request.nextUrl.searchParams.get("inline") === "1"
          ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w2000"
          : original,
      );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not open this file",
      },
      { status: 502, headers },
    );
  }
}
