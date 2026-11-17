import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getStorageSecret } from "@/lib/storage-config";
import { DRIVE_CONNECTOR_SCRIPT } from "@/lib/drive-connector-script";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await verifyAdminSession()))
    return NextResponse.json(
      { error: "Administrator sign-in required" },
      { status: 401 },
    );
  const secret = await getStorageSecret({ create: true });
  return NextResponse.json(
    {
      script: DRIVE_CONNECTOR_SCRIPT.replace(
        '"__CONNECTOR_SECRET__"',
        JSON.stringify(secret),
      ),
      configured: !!process.env.APPS_SCRIPT_UPLOAD_URL,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
