import { NextResponse } from "next/server";
import {
  BankError,
  deleteTeacherBankItem,
  getTeacherQuestionBank,
  restoreBuiltinBankItem,
  saveTeacherBankItem,
} from "@/lib/review/bank";
import type { FormLevel, Item } from "@/lib/review/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function failure(err: unknown) {
  if (err instanceof BankError) {
    return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
  }
  return NextResponse.json(
    { error: "Could not update question bank." },
    { status: 500, headers: NO_STORE },
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const form = Number(url.searchParams.get("form") || 1) as FormLevel;
    return NextResponse.json(await getTeacherQuestionBank(form), { headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}

export async function POST(request: Request) {
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
      throw new BankError(403, "Origin is not allowed.");
    }
    const raw = await request.text();
    if (raw.length > 100_000) {
      throw new BankError(413, "Request payload is too large.");
    }
    const body = JSON.parse(raw) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const formLevel = Number(body.formLevel || 1) as FormLevel;
    const checkpointId = String(body.checkpointId ?? "").trim();

    if (action === "save") {
      return NextResponse.json(
        await saveTeacherBankItem({
          formLevel,
          checkpointId,
          item: body.item as Item,
          misconceptions: (body.misconceptions as Record<string, string>) ?? {},
        }),
        { headers: NO_STORE },
      );
    }

    if (action === "delete") {
      return NextResponse.json(
        await deleteTeacherBankItem({
          formLevel,
          checkpointId,
          itemId: String(body.itemId ?? ""),
        }),
        { headers: NO_STORE },
      );
    }

    if (action === "restore") {
      return NextResponse.json(
        await restoreBuiltinBankItem({
          formLevel,
          checkpointId,
          itemId: String(body.itemId ?? ""),
        }),
        { headers: NO_STORE },
      );
    }

    throw new BankError(400, "Unsupported question bank action.");
  } catch (err) {
    return failure(err);
  }
}
