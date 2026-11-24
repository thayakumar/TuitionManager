"use client";
import { useActionBusy } from "@/components/action-busy";

import { SignInShell } from "@/components/sign-in-shell";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { loginAdmin } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClass =
  "flex h-12 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  useActionBusy(isPending, "Signing in…");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      const result = await loginAdmin(formData);
      if (result.success) {
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next?.startsWith("/oauth/authorize?") ? next : "/dashboard");
        router.refresh();
      } else {
        setError(result.error || "Invalid credentials");
      }
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <SignInShell role="Admin">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="admin-username">Username</Label>
          <input
            id="admin-username"
            name="username"
            required
            autoFocus
            placeholder="Admin username"
            autoComplete="username"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-password">Password</Label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            placeholder="Admin password"
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            "Signing in..."
          ) : (
            <>
              <LogIn size={16} /> Sign In
            </>
          )}
        </Button>
      </form>
    </SignInShell>
  );
}
