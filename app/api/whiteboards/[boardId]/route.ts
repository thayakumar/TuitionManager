import { NextRequest, NextResponse } from "next/server";
import {
  MAX_WHITEBOARD_BYTES,
  WhiteboardError,
  readWhiteboard,
  writeWhiteboard,
} from "@/lib/whiteboards";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
type Context = { params: Promise<{ boardId: string }> };
function sameOrigin(request: NextRequest, mutation = false) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (mutation && !origin)
  )
    throw new WhiteboardError(
      403,
      "Whiteboard requests must come from this site",
    );
  if (origin) {
    // Next may expose its internal localhost URL behind the hosting proxy.
    // Match the browser against the public request host/protocol instead.
    const url = new URL(request.url);
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      request.headers.get("host") ||
      url.host;
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
      url.protocol.slice(0, -1);
    let expectedOrigin: string;
    try {
      if (protocol !== "http" && protocol !== "https")
        throw new Error("Invalid protocol");
      expectedOrigin = new URL(`${protocol}://${host}`).origin;
    } catch {
      throw new WhiteboardError(
        403,
        "Whiteboard requests must come from this site",
      );
    }
    if (origin !== expectedOrigin)
      throw new WhiteboardError(
        403,
        "Whiteboard requests must come from this site",
      );
  }
}
function failure(error: unknown) {
  if (error instanceof WhiteboardError)
    return NextResponse.json(
      {
        error: error.message,
        ...(error.current ? { current: error.current } : {}),
      },
      { status: error.status, headers },
    );
  console.error(
    "Whiteboard request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    { error: "The whiteboard could not be loaded or saved. Please try again" },
    { status: 500, headers },
  );
}
export async function GET(request: NextRequest, context: Context) {
  try {
    sameOrigin(request);
    const previous = /^"whiteboard-(\d+)"$/.exec(
      request.headers.get("if-none-match") ?? "",
    );
    const knownRevision =
      previous && Number.isSafeInteger(Number(previous[1]))
        ? Number(previous[1])
        : undefined;
    const board = await readWhiteboard(
      (await context.params).boardId,
      knownRevision,
    );
    const responseHeaders = {
      ...headers,
      ETag: `"whiteboard-${board.revision}"`,
    };
    if (knownRevision === board.revision)
      return new NextResponse(null, { status: 304, headers: responseHeaders });
    return NextResponse.json(board, { headers: responseHeaders });
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    sameOrigin(request, true);
    const limit = MAX_WHITEBOARD_BYTES + 8192;
    if (Number(request.headers.get("content-length")) > limit)
      throw new WhiteboardError(
        413,
        "Whiteboard is too large. Keep it below 1 MB",
      );
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      throw new WhiteboardError(415, "Send whiteboard data as JSON");
    const reader = request.body?.getReader();
    if (!reader) throw new WhiteboardError(400, "Whiteboard data is required");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new WhiteboardError(
          413,
          "Whiteboard is too large. Keep it below 1 MB",
        );
      }
      chunks.push(part.value);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new WhiteboardError(400, "Whiteboard data must be valid JSON");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      throw new WhiteboardError(400, "A whiteboard payload is required");
    const { data, revision } = payload as { data: unknown; revision: unknown };
    return NextResponse.json(
      await writeWhiteboard((await context.params).boardId, data, revision),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
