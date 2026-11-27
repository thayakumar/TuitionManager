import { NextResponse } from "next/server";
import {
  getStudentReviewMap,
  getTeacherStudentReviewReport,
  ReviewError,
  setStudentReviewForm,
  setTutorCheckpointUnlock,
  startOrResumeCheckpoint,
  submitCheckpointAnswer,
} from "@/lib/review/service";
import type { Confidence, FormLevel, ItemResponse } from "@/lib/review/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function failure(err: unknown) {
  if (err instanceof ReviewError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status, headers: NO_STORE },
    );
  }
  return NextResponse.json(
    { error: "Could not process Review Quest request." },
    { status: 500, headers: NO_STORE },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const studentId = Number((await params).studentId);
    const url = new URL(request.url);
    const viewer = url.searchParams.get("viewer") ?? "student";
    if (viewer === "admin") {
      const formParam = url.searchParams.get("form");
      const form = formParam ? (Number(formParam) as FormLevel) : null;
      return NextResponse.json(
        await getTeacherStudentReviewReport(studentId, form),
        { headers: NO_STORE },
      );
    }
    return NextResponse.json(await getStudentReviewMap(studentId), {
      headers: NO_STORE,
    });
  } catch (err) {
    return failure(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const origin = request.headers.get("origin");
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      request.headers.get("host") ||
      new URL(request.url).host;
    let allowedOrigin = false;
    try {
      allowedOrigin = !!origin && new URL(origin).host === host;
    } catch {
      allowedOrigin = false;
    }
    if (!allowedOrigin) {
      throw new ReviewError(403, "Origin is not allowed.", "FORBIDDEN_ORIGIN");
    }
    if (Number(request.headers.get("content-length") || 0) > 65_536) {
      throw new ReviewError(413, "Request payload is too large.", "PAYLOAD_TOO_LARGE");
    }
    const raw = await request.text();
    if (raw.length > 65_536) {
      throw new ReviewError(413, "Request payload is too large.", "PAYLOAD_TOO_LARGE");
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ReviewError(400, "Invalid JSON payload.", "BAD_JSON");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ReviewError(400, "Invalid request body.", "BAD_BODY");
    }

    const studentId = Number((await params).studentId);
    const action = String(body.action ?? "");

    if (action === "start") {
      const checkpointId = String(body.checkpointId ?? "").trim();
      if (!checkpointId || checkpointId.length > 64) {
        throw new ReviewError(400, "Checkpoint ID is required.");
      }
      return NextResponse.json(
        await startOrResumeCheckpoint(studentId, checkpointId, {
          forceRestart: body.forceRestart === true,
        }),
        { headers: NO_STORE },
      );
    }

    if (action === "answer") {
      return NextResponse.json(
        await submitCheckpointAnswer({
          studentId,
          attemptId: Number(body.attemptId),
          itemId: String(body.itemId ?? ""),
          response: body.response as ItemResponse,
          confidence: (body.confidence as Confidence | null) ?? null,
          timeMs: Number(body.timeMs ?? 0),
        }),
        { headers: NO_STORE },
      );
    }

    if (action === "unlock") {
      return NextResponse.json(
        await setTutorCheckpointUnlock({
          studentId,
          formLevel: Number(body.formLevel) as FormLevel,
          checkpointId: String(body.checkpointId ?? ""),
          unlocked: body.unlocked === true,
        }),
        { headers: NO_STORE },
      );
    }

    if (action === "set_form") {
      return NextResponse.json(
        await setStudentReviewForm({
          studentId,
          formLevel: Number(body.formLevel) as FormLevel,
        }),
        { headers: NO_STORE },
      );
    }

    throw new ReviewError(400, "Unsupported Review Quest action.", "UNKNOWN_ACTION");
  } catch (err) {
    return failure(err);
  }
}
