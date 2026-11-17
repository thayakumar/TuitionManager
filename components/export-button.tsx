"use client";
import { useActionBusy } from "@/components/action-busy";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actionError } from "@/lib/action-errors";
export function ExportButton({
  getData,
  filename,
}: {
  getData: () => Promise<string>;
  filename: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useActionBusy(busy, "Preparing export…");
  return (
    <div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setError(null);
          try {
            const csv = await getData(),
              url = URL.createObjectURL(
                new Blob([csv], { type: "text/csv;charset=utf-8;" }),
              ),
              a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (e) {
            setError(actionError(e, "Export could not be downloaded."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={16} />
        {busy ? "Preparing…" : "Export CSV"}
      </Button>
      {error && (
        <p role="alert" className="mt-1 max-w-xs text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
