"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";
import { toast } from "sonner";
import { generateMonthlyDraftsAction } from "@/lib/actions";
import { useActionBusy } from "@/components/action-busy";
import { Button } from "@/components/ui/button";

export function MonthlyDraftsButton({ month }: { month: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  useActionBusy(busy, `Generating ${month} draft invoices…`);

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await generateMonthlyDraftsAction(month);
      if (!result.success) {
        toast.error(result.error || "Could not generate month-end drafts.");
        return;
      }
      if (result.created && result.created > 0) {
        toast.success(
          `Created ${result.created} draft ${result.created === 1 ? "invoice" : "invoices"} for ${month}.`,
        );
      } else if (result.alreadyProcessed) {
        toast.info(`Drafts for ${month} were already generated.`);
      } else {
        toast.info(`No unbilled completed lessons found for ${month}.`);
      }
      router.refresh();
    } catch {
      toast.error("Could not generate month-end drafts.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={run}>
      <CalendarCheck2 size={14} aria-hidden="true" />
      {busy ? "Generating…" : `Drafts for ${month}`}
    </Button>
  );
}
