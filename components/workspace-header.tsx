"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";

const labels: Record<string, string> = {
  students: "Students", schedule: "Schedule", invoices: "Invoices",
  "financial-history": "Financial history", classroom: "Classroom", requests: "Requests",
  notifications: "Notifications", settings: "Settings", classes: "Lesson details",
  attendance: "Attendance", reports: "Class reports", notes: "My notes", profile: "My profile",
  recurring: "Recurring lessons",
};

export function WorkspaceHeader({ role = "Admin", name }: { role?: "Admin" | "Student" | "Parent"; name?: string }) {
  const path = usePathname();
  const segments = path.split("/").filter(Boolean);
  const section = segments.filter((s) => labels[s]).map((s) => labels[s]).pop() || "Overview";
  const home = role === "Student" ? `/${segments.slice(0, 3).join("/")}` : role === "Parent" ? `/${segments.slice(0, 2).join("/")}` : "/";
  return (
    <header className="workspace-header no-print">
      <div className="flex min-w-0 items-center gap-3 text-xs">
        <Link href={home} className="truncate text-muted-foreground hover:text-primary">{name ? `${name}’s space` : "Your workspace"}</Link>
        <ChevronRight size={13} className="shrink-0 text-muted-foreground/50" />
        <span className="truncate font-medium">{section}</span>
      </div>
      <div className="workspace-role"><span className="size-1.5 rounded-full bg-primary" />{role} workspace</div>
      <div className="hidden items-center gap-2 text-xs text-muted-foreground xl:flex"><Sparkles size={13} className="text-primary" /> A little clarity for your day</div>
    </header>
  );
}
