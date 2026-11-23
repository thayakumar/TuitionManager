import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { getStorageSecret } from "@/lib/storage-config";
import { driveFileId } from "@/lib/attachment-url";
import { storageFile } from "@/lib/storage-response";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function connect(action: string, extra: Record<string, unknown> = {}) {
  const secret = await getStorageSecret(),
    url = process.env.APPS_SCRIPT_UPLOAD_URL;
  if (!secret || !url)
    throw new Error(
      "Open Settings → File storage to update the Drive connector before recovering files.",
    );
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, secret, ...extra }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok || data.success !== true || data.version !== 2)
    throw new Error(
      "Update and redeploy the connector from Settings → File storage to access your existing Drive files.",
    );
  return data;
}
export async function GET() {
  if (!(await verifyAdminSession()))
    return NextResponse.json(
      { error: "Administrator sign-in required" },
      { status: 401, headers },
    );
  try {
    return NextResponse.json(
      { files: (await connect("list")).files || [] },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        code: "CONNECTOR_UPGRADE",
        error:
          error instanceof Error ? error.message : "Could not load Drive files",
      },
      { status: 409, headers },
    );
  }
}
export async function POST(request: NextRequest) {
  if (!(await verifyAdminSession()))
    return NextResponse.json(
      { error: "Administrator sign-in required" },
      { status: 401, headers },
    );
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    request.headers.get("host") ||
    new URL(request.url).host;
  try {
    if (new URL(request.headers.get("origin") || "").host !== host)
      return NextResponse.json(
        { error: "Request origin is not allowed" },
        { status: 403, headers },
      );
  } catch {
    return NextResponse.json(
      { error: "Request origin is not allowed" },
      { status: 403, headers },
    );
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Choose a Drive file" },
      { status: 400, headers },
    );
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return NextResponse.json(
      { error: "Choose a Drive file" },
      { status: 400, headers },
    );
  try {
    const { fileId } = payload as { fileId?: unknown };
    if (typeof fileId !== "string" || !/^[A-Za-z0-9_-]{10,}$/.test(fileId))
      return NextResponse.json(
        { error: "Choose a Drive file" },
        { status: 400, headers },
      );
    const stored = await connect("finish", { fileId });
    const result = storageFile(stored);
    if ((result.fileId || driveFileId(result.fileUrl)) !== fileId)
      throw new Error("Drive returned a different file from the selected attachment");
    const fileType =
      typeof stored.fileType === "string"
        ? stored.fileType
        : "application/octet-stream";
    await execute(
      "INSERT OR IGNORE INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,mime_type) VALUES(?,'admin',NULL,?,?)",
      [fileId, result.fileName || "Attachment", fileType],
    );
    return NextResponse.json(
      { ...result, fileType, inlineUrl: "/api/files/" + fileId + "?inline=1" },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not attach this Drive file",
      },
      { status: 502, headers },
    );
  }
}
