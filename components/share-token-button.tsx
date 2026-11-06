"use client";
import { useState } from "react";
import { Link2, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateShareToken, revokeShareToken } from "@/lib/actions";

export function ShareTokenButton({ studentId, existingToken }: { studentId: number; existingToken: string | null }) {
  const [token, setToken] = useState(existingToken);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    const newToken = await generateShareToken(studentId);
    setToken(newToken);
  }

  async function handleRevoke() {
    await revokeShareToken(studentId);
    setToken(null);
  }

  function handleCopy() {
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <Button variant="outline" onClick={handleGenerate} className="gap-1.5">
        <Link2 size={16} /> Generate parent link
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleCopy} className="gap-1.5">
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied!" : "Copy parent link"}
      </Button>
      <Button variant="ghost" onClick={handleRevoke} title="Revoke link">
        <X size={16} />
      </Button>
    </div>
  );
}
