"use client";

import { SignInShell } from "@/components/sign-in-shell";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogIn } from "lucide-react";
import { loginStudent } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClass =
  "flex h-12 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function StudentLoginPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      const result = await loginStudent(formData);
      if (result.success && result.studentId) {
        router.push(`/portal/student/${result.studentId}`);
        router.refresh();
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <SignInShell role="Student">
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="login-username">Username</Label>
              <input
                id="login-username"
                name="username"
                required
                autoFocus
                placeholder="Your first name"
                autoComplete="username"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                placeholder="Enter password"
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
<p className="mt-4 text-xs text-muted-foreground">Contact your tutor if you need login credentials.</p>
    </SignInShell>
  );
}
