"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Link2, X } from "lucide-react";
import { generateShareToken, revokeShareToken } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { Button } from "@/components/ui/button";

export function ShareTokenButton({
  studentId,
  existingToken,
}: {
  studentId: number;
  existingToken: string | null;
}) {
  const [token, setToken] = useState(existingToken);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setToken(existingToken), [existingToken]);

  async function updateAccess(revoke = false) {
    if (busy) return;
    if (
      revoke &&
      !window.confirm(
        "Revoke this parent link? Anyone with the old link will lose access.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      if (revoke) {
        await revokeShareToken(studentId);
        setToken(null);
      } else setToken(await generateShareToken(studentId));
    } catch (error) {
      setError(actionError(error, "Could not update parent access."));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/share/${token}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Clipboard access was blocked. Please allow clipboard access and try again.",
      );
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {token ? (
          <>
            <Button variant="outline" disabled={busy} onClick={copyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy parent link"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              title="Revoke link"
              aria-label="Revoke parent link"
              onClick={() => updateAccess(true)}
            >
              <X size={16} />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => updateAccess()}
          >
            <Link2 size={16} />
            {busy ? "Creating…" : "Generate parent link"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
