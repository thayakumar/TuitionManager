"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton({
  getData,
  filename,
}: {
  getData: () => Promise<string>;
  filename: string;
}) {
  async function handleExport() {
    const csv = await getData();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleExport} className="gap-1.5">
      <Download size={16} /> Export CSV
    </Button>
  );
}
