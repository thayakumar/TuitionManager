"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyLoginButton({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const base = window.location.origin;
    const text = `Student Portal Login\nURL: ${base}/portal/student\nUsername: ${username}\nPassword: ${password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Login info copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy login info"}
    </Button>
  );
}
