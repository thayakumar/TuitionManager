import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";
import { classroomAccess, ClassroomAccessError } from "@/lib/classroom-access";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const id = Number((await params).postId);
    await classroomAccess(id, true);
    const attachments = await queryAll(
      "SELECT id,post_id,file_name,file_url,file_type FROM post_attachments WHERE post_id=? ORDER BY id",
      [id],
    );
    return NextResponse.json(
      { attachments },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ClassroomAccessError
            ? error.message
            : "Could not load attachments",
      },
      { status: error instanceof ClassroomAccessError ? error.status : 500 },
    );
  }
}
