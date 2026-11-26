"use client";

import { useState, useRef } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { changeAdminPasswordAction } from "@/lib/actions";
import { useActionBusy } from "@/components/action-busy";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/form-field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useActionBusy(busy, "Updating password…");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await changeAdminPasswordAction(formData);
      if (result.success) {
        formRef.current?.reset();
        setSaved(true);
        toast.success("Password updated. Other active sessions were signed out.");
      } else {
        setError(result.error || "Could not update your password.");
      }
    } catch {
      setError("Could not update your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound size={18} className="text-primary" aria-hidden="true" />
          Account security
        </CardTitle>
        <CardDescription>
          Change your tutor sign-in password. Use at least 8 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Current password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
            />
            <Field
              label="New password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Field
              label="Confirm new password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {saved && (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            >
              Password updated successfully.
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
