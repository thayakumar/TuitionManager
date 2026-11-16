import { NextRequest, NextResponse } from "next/server";
import { getStudentSession, verifyAdminSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload-limits";

const MAX_SIZE = MAX_UPLOAD_BYTES;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

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
  return false;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    request.headers.get("host") ||
    new URL(request.url).host;
  if (origin) {
    try {
      if (new URL(origin).host !== expectedHost)
        return NextResponse.json(
          { error: "Upload origin is not allowed" },
          { status: 403 },
        );
    } catch {
      return NextResponse.json(
        { error: "Upload origin is invalid" },
        { status: 403 },
      );
    }
  }
  const [admin, studentId] = await Promise.all([
    verifyAdminSession(),
    getStudentSession(),
  ]);
  if (!admin && !studentId)
    return NextResponse.json(
      { error: "Sign in before uploading a file" },
      { status: 401 },
    );
  const uploadUrl = process.env.APPS_SCRIPT_UPLOAD_URL;
  if (!uploadUrl)
    return NextResponse.json(
      { error: "File upload not configured" },
      { status: 503 },
    );

  try {
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
    if (!ALLOWED_TYPES.has(file.type))
      return NextResponse.json(
        { error: "Choose a PDF, PNG, JPG, GIF or WebP file" },
        { status: 400 },
      );

    // Student identity is server-derived; an arbitrary studentName form value
    // must never route a student's upload into another person's identity.
    let name = "Tutor";
    if (studentId) {
      const student = await queryOne<{ name: string }>(
        "SELECT name FROM students WHERE id=? AND active=1",
        [studentId],
      );
      if (!student)
        return NextResponse.json(
          { error: "Student access is inactive" },
          { status: 403 },
        );
      name = student.name;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesType(buffer, file.type))
      return NextResponse.json(
        { error: "The file contents do not match the selected file type" },
        { status: 400 },
      );
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64: buffer.toString("base64"),
        fileName: file.name.slice(0, 255),
        fileMimeType: file.type,
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
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("success" in data) ||
      data.success !== true ||
      !("fileUrl" in data) ||
      typeof data.fileUrl !== "string"
    ) {
      return NextResponse.json(
        {
          error: "The storage service did not return a file. Please try again.",
        },
        { status: 502 },
      );
    }
    const returnedUrl = new URL(data.fileUrl);
    if (returnedUrl.protocol !== "https:" && returnedUrl.protocol !== "http:")
      return NextResponse.json(
        { error: "The storage service returned an invalid link" },
        { status: 502 },
      );
    return NextResponse.json({
      fileUrl: returnedUrl.toString(),
      fileName:
        "fileName" in data && typeof data.fileName === "string"
          ? data.fileName
          : file.name,
    });
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
