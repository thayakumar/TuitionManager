"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogIn } from "lucide-react";
import { loginStudent } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function PortalLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginStudent(formData);
      if (result.success && result.studentId) {
        router.push(`/portal/student/${result.studentId}`);
        router.refresh();
      } else {
        setError(result.error || "Invalid username or password");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg mb-4">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Student Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            TuitionHub &middot; Sign in to access your classes
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form action={handleSubmit} className="space-y-4">
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
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in..." : (
                <>
                  <LogIn size={16} /> Sign In
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Contact your tutor if you need login credentials
        </p>
      </div>
    </div>
  );
}
