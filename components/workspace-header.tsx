"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";

const labels: Record<string, string> = {
  overview: "Directory",
  documents: "Documents",
  dashboard: "Dashboard",
  diagnostic: "Diagnostic",
  diagnostics: "Diagnostics",
  review: "Review Quest",
  bank: "Question Bank",
  guide: "Teacher's Guide",
  chat: "Family chat",
  chats: "Family chats",
  students: "Students",
  schedule: "Schedule",
  invoices: "Invoices",
  "financial-history": "Financial history",
  classroom: "Classroom",
  requests: "Requests",
  notifications: "Notifications",
  settings: "Settings",
  agents: "AI connections",
  classes: "Lesson details",
  attendance: "Attendance",
  reports: "Class reports",
  notes: "Notes",
  profile: "Profile",
  recurring: "Recurring lessons",
  whiteboard: "Whiteboard",
  history: "History",
  edit: "Edit",
  new: "New",
};

export function WorkspaceHeader({
  role = "Admin",
  name,
  avatarSrc,
}: {
  role?: "Admin" | "Student" | "Parent";
  name?: string;
  avatarSrc?: string | null;
}) {
  const path = usePathname();
  const segments = path.split("/").filter(Boolean);
  const home =
    role === "Student"
      ? `/${segments.slice(0, 3).join("/")}`
      : role === "Parent"
        ? `/${segments.slice(0, 2).join("/")}`
        : "/overview";
  const baseDepth = role === "Student" ? 3 : role === "Parent" ? 2 : 0;

  const trail: Array<{ label: string; href: string }> = [];
  for (let i = baseDepth; i < segments.length; i++) {
    const seg = segments[i];
    const label = labels[seg];
    if (!label) continue;
    const href = "/" + segments.slice(0, i + 1).join("/");
    if (href === home && trail.length === 0) {
      trail.push({ label, href });
    } else if (!trail.some((item) => item.href === href)) {
      trail.push({ label, href });
    }
  }
  if (!trail.length) trail.push({ label: role === "Admin" ? "Directory" : "Home", href: home });

  return (
    <header className="workspace-header no-print hidden md:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        <Link
          href={home}
          className="truncate text-muted-foreground transition-colors duration-150 hover:text-primary"
        >
          {name ? `${name}’s workspace` : "Workspace"}
        </Link>
        {trail.map((item, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <span key={item.href} className="flex min-w-0 items-center gap-2">
              <ChevronRight
                size={14}
                className="shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
              {isLast ? (
                <span className="truncate font-semibold text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate text-muted-foreground transition-colors duration-150 hover:text-primary"
                >
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2.5">
        <CommandPalette role={role} basePath={home} />
        <div className="workspace-role">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={name ? `${name} profile` : "Profile photo"}
              className="size-6 rounded-full object-cover"
            />
          ) : (
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          )}
          {role} workspace
        </div>
      </div>
    </header>
  );
}
