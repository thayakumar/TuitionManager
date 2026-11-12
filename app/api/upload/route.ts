import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_UPLOAD_URL;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json(
      { error: "File upload not configured" },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const studentName = formData.get("studentName") as string || "student";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileBase64 = buffer.toString("base64");

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64,
      fileName: file.name,
      fileMimeType: file.type,
      studentName,
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 502 }
    );
  }

  const data = await res.json();
  if (!data.success) {
    return NextResponse.json(
      { error: data.error || "Upload failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ fileUrl: data.fileUrl, fileName: data.fileName });
}
