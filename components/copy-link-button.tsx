"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({
  url,
  label = "Copy link",
  copiedLabel = "Copied!",
  variant = "outline",
  size = "sm",
  relative = false,
}: {
  url: string;
  label?: string;
  copiedLabel?: string;
  variant?: "outline" | "secondary" | "ghost";
  size?: "sm" | "default";
  relative?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const fullUrl = relative ? `${window.location.origin}${url}` : url;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant={variant} size={size} onClick={handleCopy} className="gap-1.5">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
