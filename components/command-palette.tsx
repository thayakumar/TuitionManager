"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Files,
  Grid2X2,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  PencilRuler,
  Receipt,
  Search,
  Settings,
  StickyNote,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type CommandItem = {
  label: string;
  href: string;
  group: string;
  keywords: string;
  icon: LucideIcon;
  external?: boolean;
};

function itemsForRole(
  role: "Admin" | "Student" | "Parent",
  basePath: string,
): CommandItem[] {
  if (role === "Student") {
    return [
      {
        label: "Dashboard",
        href: basePath,
        group: "Learning",
        keywords: "home overview next class summary",
        icon: LayoutDashboard,
      },
      {
        label: "Schedule",
        href: `${basePath}/schedule`,
        group: "Learning",
        keywords: "lessons calendar timetable reschedule",
        icon: CalendarDays,
      },
      {
        label: "Classroom",
        href: `${basePath}/classroom`,
        group: "Learning",
        keywords: "assignments homework quizzes stream classwork",
        icon: BookOpen,
      },
      {
        label: "Documents",
        href: `${basePath}/documents`,
        group: "Learning",
        keywords: "files docs worksheets pdf",
        icon: Files,
      },
      {
        label: "Diagnostic",
        href: `${basePath}/diagnostic`,
        group: "Learning",
        keywords: "assessment test readiness quiz",
        icon: BrainCircuit,
      },
      {
        label: "Notes",
        href: `${basePath}/notes`,
        group: "Learning",
        keywords: "study revision notebook",
        icon: StickyNote,
      },
      {
        label: "Family chat",
        href: `${basePath}/chat`,
        group: "Communication",
        keywords: "messages tutor parent conversation",
        icon: MessagesSquare,
      },
      {
        label: "Notifications",
        href: `${basePath}/notifications`,
        group: "Communication",
        keywords: "alerts updates inbox",
        icon: Bell,
      },
      {
        label: "Profile",
        href: `${basePath}/profile`,
        group: "Account",
        keywords: "photo details account settings",
        icon: UserCircle,
      },
    ];
  }

  if (role === "Parent") {
    return [
      {
        label: "Overview",
        href: basePath,
        group: "Student progress",
        keywords: "home dashboard summary journey",
        icon: LayoutDashboard,
      },
      {
        label: "Schedule",
        href: `${basePath}/schedule`,
        group: "Student progress",
        keywords: "lessons upcoming classes timetable",
        icon: CalendarDays,
      },
      {
        label: "Attendance",
        href: `${basePath}/attendance`,
        group: "Student progress",
        keywords: "present absent rate history",
        icon: ClipboardList,
      },
      {
        label: "Class reports",
        href: `${basePath}/reports`,
        group: "Student progress",
        keywords: "feedback tutor notes progress",
        icon: MessageSquare,
      },
      {
        label: "Family chat",
        href: `${basePath}/chat`,
        group: "Communication",
        keywords: "messages tutor conversation",
        icon: MessagesSquare,
      },
      {
        label: "Invoices",
        href: `${basePath}/invoices`,
        group: "Billing",
        keywords: "payments tuition receipts outstanding",
        icon: Receipt,
      },
    ];
  }

  return [
    {
      label: "Dashboard",
      href: "/dashboard",
      group: "Teach & learn",
      keywords: "home today overview metrics attention",
      icon: LayoutDashboard,
    },
    {
      label: "Students",
      href: "/students",
      group: "Teach & learn",
      keywords: "roster learners pupils profiles add",
      icon: Users,
    },
    {
      label: "Schedule",
      href: "/schedule",
      group: "Teach & learn",
      keywords: "calendar lessons classes timetable recurring",
      icon: CalendarDays,
    },
    {
      label: "Classroom",
      href: "/classroom",
      group: "Teach & learn",
      keywords: "assignments homework grading stream posts",
      icon: BookOpen,
    },
    {
      label: "Documents",
      href: "/documents",
      group: "Teach & learn",
      keywords: "files worksheets docs pdf editor",
      icon: Files,
    },
    {
      label: "Diagnostics",
      href: "/diagnostics",
      group: "Teach & learn",
      keywords: "assessments readiness tests",
      icon: BrainCircuit,
    },
    {
      label: "Whiteboard",
      href: "/whiteboard",
      group: "Teach & learn",
      keywords: "draw canvas board teaching",
      icon: PencilRuler,
      external: true,
    },
    {
      label: "Invoices",
      href: "/invoices",
      group: "Business",
      keywords: "billing payments receipts drafts overdue",
      icon: Receipt,
    },
    {
      label: "Financial history",
      href: "/financial-history",
      group: "Business",
      keywords: "revenue income earnings monthly analytics",
      icon: BarChart3,
    },
    {
      label: "Family chats",
      href: "/chats",
      group: "Stay connected",
      keywords: "messages parents students inbox",
      icon: MessagesSquare,
    },
    {
      label: "Reschedule requests",
      href: "/requests",
      group: "Stay connected",
      keywords: "approve decline reschedule changes",
      icon: CalendarClock,
    },
    {
      label: "Notifications",
      href: "/notifications",
      group: "Stay connected",
      keywords: "alerts updates unread",
      icon: Bell,
    },
    {
      label: "Directory",
      href: "/overview",
      group: "Workspace",
      keywords: "all pages map shortcuts",
      icon: Grid2X2,
    },
    {
      label: "Settings",
      href: "/settings",
      group: "Workspace",
      keywords: "business currency timezone ai connections preferences",
      icon: Settings,
    },
  ];
}

export function CommandPalette({
  role = "Admin",
  basePath = "/dashboard",
}: {
  role?: "Admin" | "Student" | "Parent";
  basePath?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(
    () => itemsForRole(role, basePath),
    [role, basePath],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    );
  }, [allItems, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function selectItem(item: CommandItem) {
    setOpen(false);
    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(item.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((idx) => (idx + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((idx) => (idx - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) selectItem(target);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ item: CommandItem; index: number }>>();
    filtered.forEach((item, index) => {
      const list = map.get(item.group) ?? [];
      list.push({ item, index });
      map.set(item.group, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick jump (Ctrl+K or Command+K)"
        className="group inline-flex min-h-9 items-center gap-2.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs transition-[background-color,border-color,color,box-shadow] duration-150 ease-out hover:border-primary/40 hover:bg-card hover:text-foreground hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search
          size={14}
          className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
        <span className="hidden lg:inline">Jump to…</span>
        <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Quick jump navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages and jump directly across your workspace.
          </DialogDescription>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Search
              size={18}
              className="shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Jump to schedule, students, invoices, classroom…"
              aria-label="Search workspace pages"
              className="w-full border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:shadow-none focus-visible:outline-none"
            />
            <kbd className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          <div
            role="listbox"
            aria-label="Workspace destinations"
            className="max-h-[340px] overflow-y-auto overscroll-contain p-2"
          >
            {grouped.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  No matching pages
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try searching for schedule, classroom, invoices, or chats.
                </p>
              </div>
            ) : (
              grouped.map(([group, entries]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {entries.map(({ item, index }) => {
                      const isActive = index === activeIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectItem(item)}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-[background-color,color] duration-100 ${
                            isActive
                              ? "bg-secondary font-semibold text-primary"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                          {item.external ? (
                            <ExternalLink
                              size={14}
                              className="shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                          ) : (
                            <ArrowRight
                              size={14}
                              className={`shrink-0 transition-transform duration-150 ${
                                isActive
                                  ? "translate-x-0.5 text-primary"
                                  : "text-muted-foreground/50"
                              }`}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span>Use ↑ ↓ to navigate · Enter to open</span>
            <span>{filtered.length} destinations</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
