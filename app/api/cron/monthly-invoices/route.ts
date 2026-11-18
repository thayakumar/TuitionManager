import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { dueInvoiceMonth, generateMonthlyDrafts } from "@/lib/monthly-invoices";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Monthly billing is not configured" }, { status: 503 });
  const received = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from("Bearer " + secret);
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = dueInvoiceMonth(new Date());
  if (!month) return NextResponse.json({ skipped: true, reason: "Not the monthly billing window" });
  try {
    const result = await generateMonthlyDrafts(month);
    if (result.created) {
      revalidatePath("/invoices");
      revalidatePath("/financial-history");
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Monthly invoice generation failed", error);
    return NextResponse.json({ error: "Monthly drafts could not be generated; no partial run was committed" }, { status: 500 });
  }
}
