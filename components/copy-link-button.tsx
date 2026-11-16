"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const fullUrl = relative ? `${window.location.origin}${url}` : url;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      setFallbackUrl(fullUrl);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleCopy}
        className="gap-1.5"
      >
        {copied ? (
          <Check size={14} className="text-emerald-500" />
        ) : (
          <Copy size={14} />
        )}
        {copied ? copiedLabel : label}
      </Button>
      <Dialog
        open={!!fallbackUrl}
        onOpenChange={(value) => {
          if (!value) setFallbackUrl("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy your link</DialogTitle>
            <DialogDescription>
              Your browser blocked automatic copying. Select and copy the link
              below.
            </DialogDescription>
          </DialogHeader>
          <label className="field-group">
            <span className="field-label">Link to share</span>
            <input
              readOnly
              value={fallbackUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="studio-input"
            />
          </label>
          <DialogFooter>
            <Button type="button" onClick={() => setFallbackUrl("")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
