"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" /> Print / PDF
    </Button>
  );
}

export default PrintButton;
