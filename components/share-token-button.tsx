"use client";
import { useActionBusy } from "@/components/action-busy";

import { useEffect, useState } from "react";
import { Copy, Check, Link2, X } from "lucide-react";
import { generateShareToken, revokeShareToken } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ShareTokenButton({
  studentId,
  existingToken,
}: {
  studentId: number;
  existingToken: string | null;
}) {
  const [token, setToken] = useState(existingToken);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  useActionBusy(busy, "Updating parent access…");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setToken(existingToken), [existingToken]);

  async function updateAccess(revoke = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (revoke) {
        await revokeShareToken(studentId);
        setToken(null);
        setConfirming(false);
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
    <div className="w-full sm:w-auto">
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
              className="!flex-none shrink-0"
              size="icon"
              title="Revoke link"
              aria-label="Revoke parent link"
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
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
      <Dialog
        open={confirming}
        onOpenChange={(value) => {
          if (!busy) setConfirming(value);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Revoke parent access?</DialogTitle>
            <DialogDescription>
              The current shared link will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <section className="form-section">
            <h3 className="form-section-title">What changes</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Anyone using this link will lose access to this student’s parent
              view. Lessons, reports and invoices are preserved. You can
              generate a new link when needed.
            </p>
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep parent access
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => updateAccess(true)}
            >
              {busy ? "Revoking…" : "Revoke link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error && !confirming && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
