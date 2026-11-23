import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { storageFile } from "@/lib/storage-response";
import { getStorageSecret } from "@/lib/storage-config";
import { attachmentTransfer, currentUploadActor, uploadOrigin } from "@/lib/attachment-transfer";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  uploadMime,
} from "@/lib/upload-limits";

const MAX_SIZE = MAX_UPLOAD_BYTES;
function matchesType(bytes: Buffer, mime: string): boolean {
  if (mime === "application/pdf")
    return bytes.subarray(0, 5).toString() === "%PDF-";
  if (mime === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/gif")
    return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
  if (mime === "image/webp")
    return (
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP"
    );
  return true;
}

export async function POST(request: NextRequest) {
  const originError = uploadOrigin(request);
  if (originError) return NextResponse.json({ error: originError === "invalid" ? "Upload origin is invalid" : "Upload origin is not allowed" }, { status: 403 });
  const actor = await currentUploadActor(request);
  if (!actor) return NextResponse.json({ error: "Sign in before uploading a file" }, { status: 401 });
  const admin = actor.admin;
  const uploadUrl = process.env.APPS_SCRIPT_UPLOAD_URL;
  if (!uploadUrl)
    return NextResponse.json(
      { error: "File upload not configured" },
      { status: 503 },
    );

  const secret = await getStorageSecret();
  const transfer = attachmentTransfer(request, actor, secret);
  const registered = async (result: ReturnType<typeof storageFile>, fallback: string, expectedFileId?: string) => {
    const completed = await transfer.complete(result, fallback, expectedFileId);
    const response = NextResponse.json(completed.body);
    if (completed.receipt) response.headers.append("Set-Cookie", completed.receipt);
    return response;
  };
  try {
    if (
      request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      let input;
      try { input=await request.json(); }
      catch { return NextResponse.json({error:"Invalid upload JSON"},{status:400}); }
      if(!input || typeof input!=="object" || Array.isArray(input))
        return NextResponse.json({error:"Upload request must be an object"},{status:400});
      if (!secret)
        return NextResponse.json(
          {
            code: "CONNECTOR_UPGRADE",
            error:
              "Open Settings → File storage to finish the one-time Drive connector upgrade.",
          },
          { status: 409 },
        );
      if (input.action === "begin") {
        const name =
          typeof input.fileName === "string"
            ? input.fileName.slice(0, 255)
            : "";
        const mime = uploadMime({ name, type: String(input.fileType || "") });
        if (
          !name ||
          !mime ||
          !Number.isSafeInteger(input.size) ||
          input.size <= 0
        )
          return NextResponse.json(
            { error: "Choose a supported, non-empty file." },
            { status: 400 },
          );
        const student = actor.studentId
          ? await queryOne<{ name: string }>(
              "SELECT name FROM students WHERE id=? AND active=1",
              [actor.studentId],
            )
          : null;
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "begin",
            secret,
            fileName: name,
            fileMimeType: mime,
            size: input.size,
            studentName: admin ? "Tutor" : student?.name || "Student",
          }),
          signal: AbortSignal.timeout(30000),
        });
        const result = await response.json();
        if (result.version !== 2)
          return NextResponse.json(
            {
              code: "CONNECTOR_UPGRADE",
              error:
                "Update and redeploy the Drive connector from Settings → File storage before uploading larger files.",
            },
            { status: 409 },
          );
        if (
          !response.ok ||
          result.success !== true ||
          !result.uploadUrl ||
          !result.fileId
        )
          return NextResponse.json(
            {
              error:
                typeof result.error === "string"
                  ? result.error
                  : "Drive could not start this upload. Check connector authorization and Drive storage.",
            },
            { status: 502 },
          );
        return NextResponse.json(transfer.begin({ fileId: result.fileId, uploadUrl: result.uploadUrl, size: input.size, mimeType: mime }));
      }
      if (input.action === "finish") {
        const ticket = transfer.ticket(String(input.ticket || ""));
        if (!ticket)
          return NextResponse.json(
            { error: "This upload session is no longer available." },
            { status: 403 },
          );
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "finish",
            secret,
            fileId: ticket.fileId,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error("Drive could not finish this upload");
        const result = storageFile(await response.json());
        return await registered(result, String(input.fileName || "Attachment"), ticket.fileId);
      }
      return NextResponse.json(
        { error: "Unknown upload action" },
        { status: 400 },
      );
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_SIZE + 64 * 1024)
      return NextResponse.json(
        { error: `File too large (max ${MAX_UPLOAD_LABEL})` },
        { status: 413 },
      );
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size)
      return NextResponse.json(
        { error: "Choose a non-empty file" },
        { status: 400 },
      );
    if (file.size > MAX_SIZE)
      return NextResponse.json(
        { error: `File too large (max ${MAX_UPLOAD_LABEL})` },
        { status: 400 },
      );
    const mime = uploadMime(file);
    if (!mime)
      return NextResponse.json(
        {
          error:
            "Choose a document, image, spreadsheet, presentation, audio, video or archive",
        },
        { status: 400 },
      );

    // Student identity is server-derived; an arbitrary studentName form value
    // must never route a student's upload into another person's identity.
    let name = "Tutor";
    if (actor.studentId) {
      const student = await queryOne<{ name: string }>(
        "SELECT name FROM students WHERE id=? AND active=1",
        [actor.studentId],
      );
      if (!student)
        return NextResponse.json(
          { error: "Student access is inactive" },
          { status: 403 },
        );
      name = student.name;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesType(buffer, mime))
      return NextResponse.json(
        { error: "The file contents do not match the selected file type" },
        { status: 400 },
      );
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        fileBase64: buffer.toString("base64"),
        fileName: file.name.slice(0, 255),
        fileMimeType: mime,
        studentName: name,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            "The storage service could not accept this file. Please try again.",
        },
        { status: 502 },
      );
    let result;
    try {
      result = storageFile(await response.json());
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof SyntaxError
              ? "Drive returned an unreadable response. Check the upload connector web-app deployment."
              : error instanceof Error
                ? error.message
                : "The storage response was invalid.",
        },
        { status: 502 },
      );
    }
    return await registered(result, file.name);
  } catch (error) {
    if (error instanceof TypeError)
      return NextResponse.json(
        {
          error:
            "The file or storage response was invalid. Choose the file again.",
        },
        { status: 400 },
      );
    return NextResponse.json(
      {
        error:
          "Upload could not complete. Your assignment has not been submitted; please try again.",
      },
      { status: 502 },
    );
  }
}
