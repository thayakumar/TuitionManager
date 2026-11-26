import Link from "next/link";
import { BrandHomeLink } from "@/components/brand-home-link";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";

export function SignInShell({
  role,
  children,
}: {
  role: "Admin" | "Student";
  children: React.ReactNode;
}) {
  return (
    <main className="signin-shell">
      <section className="signin-story" aria-label="About TuitionHub">
        <BrandHomeLink
          href={role === "Admin" ? "/dashboard" : "/portal/student"}
          onDark
        />

        <div className="my-auto py-16">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[.2em] text-teal-200">
            A little space for big ideas
          </p>
          <p className="font-display max-w-lg text-4xl font-semibold leading-[1.12] tracking-tight lg:text-6xl">
            Good lessons.
            <br />
            Bright futures.
            <br />
            <span className="text-amber-200">All together.</span>
          </p>
          <p className="mt-7 max-w-sm text-sm leading-7 text-white/75">
            A thoughtful home for lessons, learning and the small steps that
            make a big difference.
          </p>
          <div className="signin-art" aria-hidden="true">
            <div className="signin-art-card">
              <BookOpen size={30} />
              <span>Room to learn.</span>
              <div className="art-line" />
              <div className="art-line short" />
            </div>
            <div className="signin-art-sticker">
              <Sparkles size={25} />
            </div>
          </div>
        </div>
        <p className="text-xs text-white/60">
          More clarity. More room to grow.
        </p>
      </section>
      <section className="signin-form-panel">
        <div className="mx-auto w-full max-w-sm">
          <p className="eyebrow mb-5">{role} workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back.
          </h1>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-muted-foreground">
            {role === "Admin"
              ? "Your teaching day starts here. Sign in to your workspace."
              : "Your next bright idea starts here. Sign in to keep learning."}
          </p>
          {children}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground">
            <span>
              Looking for the {role === "Admin" ? "student" : "admin"} space?
            </span>
            <Link
              className="flex items-center gap-1 font-medium text-primary hover:underline"
              href={role === "Admin" ? "/portal/student" : "/portal/admin"}
            >
              Go there <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
