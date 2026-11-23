import { createHash } from "crypto";
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
async function serveFile(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const id = (await params).fileId;
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id))
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404, headers },
    );
  const admin = await verifyAdminSession();
  let sid = admin ? null : await getStudentSession();
  // Parent links retain their own scoped identity even when a student cookie
  // exists in the browser. A token never grants general student-file access.
  const parentToken = request.nextUrl.searchParams.get("parent_token");
  let parentViewer = false;
  let parentPhoto = false;
  if (!admin && parentToken) {
    if (parentToken.length > 512) return NextResponse.json({ error: "Attachment not found" }, { status: 404, headers });
    const parent = await queryOne<{ student_id: number; profile_photo_url: string | null }>(
      "SELECT t.student_id,s.profile_photo_url FROM share_tokens t JOIN students s ON s.id=t.student_id WHERE t.token=? AND t.active=1",
      [parentToken],
    );
    if (!parent) return NextResponse.json({ error: "Attachment not found" }, { status: 404, headers });
    sid = parent.student_id;
    parentViewer = true;
    parentPhoto = driveFileId(parent.profile_photo_url) === id;
  }
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
    parent_token_hash: string | null;
  }>("SELECT owner_role,owner_student_id,parent_token_hash FROM uploaded_files WHERE file_id=?", [
    id,
  ]);
  const ownsUpload =
    !!metadata &&
    metadata.owner_role === "student" &&
    metadata.owner_student_id === sid &&
    (parentViewer
      ? metadata.parent_token_hash === createHash("sha256").update(parentToken!).digest("hex")
      : !metadata.parent_token_hash);
  const pending =
    !parentViewer &&
    secret &&
    pendingFiles(request.headers, secret).some((ticket) =>
      ticketAllows(ticket, actor, id),
    );
  let shared = parentPhoto;
  if (!admin && !ownsUpload && !pending && !shared) {
    const chat = await queryOne(
      `SELECT m.id FROM family_chat_messages m JOIN family_chat_rooms r ON r.id=m.room_id
       WHERE r.student_id=? AND m.deleted_at IS NULL AND
       (EXISTS(SELECT 1 FROM json_each(m.attachments) a WHERE json_extract(a.value,'$.fileUrl')=?)
        OR instr(m.body,?)>0) LIMIT 1`,
      [sid, "/api/files/" + id, '/api/files/' + id + '?inline=1"'],
    );
    shared = !!chat;
    if (parentViewer && !shared)
      return NextResponse.json({ error: "Attachment not found" }, { status: 404, headers });
  }
  if (!admin && !ownsUpload && !pending && !shared) {
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
          request.nextUrl.searchParams.get("inline") === "1"
            ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w2000"
            : "https://drive.google.com/file/d/" + id + "/view",
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
  const abort = new AbortController();
  const stop = () => abort.abort();
  request.signal.addEventListener("abort", stop, { once: true });
  if (request.signal.aborted) abort.abort();
  async function read(offset: number, length: number) {
    const r = await fetch(connector!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "read",
        secret,
        fileId: id,
        offset,
        length,
      }),
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
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
    const head = request.method === "HEAD";
    const range = request.headers.get("range");
    // HEAD reads one byte for trusted Drive metadata; PDF inspection must not
    // initiate an entire attachment transfer before the viewer even opens.
    const first = await read(0, head || range ? 1 : 1024 * 1024);
    const total = Number(first.total);
    if (!Number.isSafeInteger(total) || total <= 0)
      throw new Error("Drive returned an invalid file size");
    let start = 0, end = total - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let valid = !!match && !!(match[1] || match[2]);
      if (valid && match) {
        if (!match[1]) {
          const suffix = Number(match[2]);
          valid = Number.isSafeInteger(suffix) && suffix > 0;
          start = Math.max(0, total - suffix);
        } else {
          start = Number(match[1]);
          end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
          valid = Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < total;
        }
      }
      if (!valid) {
        request.signal.removeEventListener("abort", stop);
        return new Response(null, { status: 416, headers: { ...headers, "Content-Range": "bytes */" + total, "Accept-Ranges": "bytes" } });
      }
    }
    const inline = request.nextUrl.searchParams.get("inline") === "1" &&
      /^(?:image\/(?:png|jpeg|gif|webp)|application\/pdf)$/.test(first.mimeType);
    const name = (first.fileName || "Attachment").replace(/[\r\n\"]/g, "_");
    const responseHeaders = {
      ...headers,
      "Content-Type": inline ? first.mimeType : "application/octet-stream",
      "Content-Disposition": (inline ? "inline" : "attachment") + "; filename*=UTF-8''" + encodeURIComponent(name),
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${total}` } : {}),
    };
    if (head) {
      request.signal.removeEventListener("abort", stop);
      return new Response(null, { status: range ? 206 : 200, headers: responseHeaders });
    }
    let offset = start;
    let buffered = !range ? first : null;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (offset > end) {
          request.signal.removeEventListener("abort", stop);
          controller.close();
          return;
        }
        try {
          const wanted = Math.min(1024 * 1024, end - offset + 1);
          const part = buffered || await read(offset, wanted);
          buffered = null;
          const bytes = Buffer.from(part.base64, "base64");
          if (!bytes.length || bytes.length > wanted || part.nextOffset !== offset + bytes.length || part.total !== total)
            throw new Error("Drive returned an incomplete file range");
          offset += bytes.length;
          controller.enqueue(bytes);
        } catch (error) {
          request.signal.removeEventListener("abort", stop);
          controller.error(error);
        }
      },
      cancel() {
        abort.abort();
        request.signal.removeEventListener("abort", stop);
      },
    });
    return new Response(stream, { status: range ? 206 : 200, headers: responseHeaders });
  } catch (error) {
    request.signal.removeEventListener("abort", stop);
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

export const GET = serveFile;
export const HEAD = serveFile;
