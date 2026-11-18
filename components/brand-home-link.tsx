"use client";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
export function BrandHomeLink({
  href = "/dashboard",
  compact = false,
  subtitle = "Teaching together",
  className = "",
  onNavigate,
  disabled = false,
  onDark = false,
}: {
  href?: string;
  compact?: boolean;
  subtitle?: string;
  className?: string;
  onNavigate?: () => void | Promise<void>;
  disabled?: boolean;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      data-brand-home="true"
      aria-label="TuitionHub — go to dashboard"
      title={compact ? "TuitionHub — Dashboard" : undefined}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        if (
          onNavigate &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          void onNavigate();
        }
      }}
      className={
        "brand-home-link inline-flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (disabled ? "pointer-events-none opacity-50 " : "") +
        className
      }
    >
      <span className="brand-mark flex size-10 shrink-0 items-center justify-center rounded-2xl text-white">
        <GraduationCap size={24} aria-hidden="true" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <strong
            className={
              "block truncate text-lg font-bold tracking-tight " +
              (onDark ? "text-white" : "text-foreground")
            }
          >
            TuitionHub
          </strong>
          <span
            className={
              "block truncate text-xs " +
              (onDark ? "text-white/70" : "text-muted-foreground")
            }
          >
            {subtitle}
          </span>
        </span>
      )}
    </Link>
  );
}
