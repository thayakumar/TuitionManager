"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Settings,
  GraduationCap,
  Menu,
  BookOpen,
  Video,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/components/layout-shell";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logoutAdmin } from "@/lib/actions";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const overviewLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
];

const managementLinks = [
  { href: "/students", label: "Students", icon: Users },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/classroom", label: "Classroom", icon: BookOpen },
];

const systemLinks = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-lg text-sm transition-all",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon size={18} />
      {!collapsed && label}
    </Link>
  );
}

function NavSection({
  title,
  links,
  pathname,
  collapsed,
}: {
  title: string;
  links: typeof overviewLinks;
  pathname: string;
  collapsed?: boolean;
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {title}
        </div>
      )}
      {links.map((l) => {
        const active =
          l.href === "/"
            ? pathname === "/"
            : pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} active={active} collapsed={collapsed} />
        );
      })}
    </div>
  );
}

function SidebarContent({ pathname, collapsed }: { pathname: string; collapsed?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className={collapsed ? "px-2 py-5" : "px-4 py-5"}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shrink-0">
            <GraduationCap size={20} />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold tracking-tight text-foreground">
                TuitionHub
              </div>
              <div className="text-[11px] text-muted-foreground">
                Management System
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <nav className={cn("flex-1 space-y-6 py-4", collapsed ? "px-1.5" : "px-3")}>
        <NavSection title="Menu" links={overviewLinks} pathname={pathname} collapsed={collapsed} />
        <NavSection title="Management" links={managementLinks} pathname={pathname} collapsed={collapsed} />
        <NavSection title="Other" links={systemLinks} pathname={pathname} collapsed={collapsed} />
      </nav>

      <Separator />

      <div className={cn("py-2", collapsed ? "px-1.5" : "px-3")}>
        <form action={logoutAdmin}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              collapsed ? "justify-center px-2" : "justify-start gap-2"
            )}
            title="Logout"
          >
            <LogOut size={16} />
            {!collapsed && <span className="text-xs">Logout</span>}
          </Button>
        </form>
      </div>

      {!collapsed && (
        <div className="px-4 py-2">
          <div className="text-[10px] text-muted-foreground/50">
            v2.0 &middot; TuitionHub
          </div>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  if (pathname.startsWith("/portal") || pathname.startsWith("/share/") || pathname.startsWith("/meeting/") || pathname === "/login") {
    return null;
  }

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <aside className={cn(
        "no-print hidden md:flex fixed inset-y-0 left-0 z-30 border-r border-border bg-card flex-col transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent pathname={pathname} collapsed={collapsed} />
        <div className={cn("border-t border-border py-2", collapsed ? "px-1.5" : "px-3")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className={cn("w-full", collapsed ? "justify-center px-2" : "justify-start gap-2")}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span className="text-xs text-muted-foreground">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar — sticky */}
      <div className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" />
            }
          >
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap size={14} />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            TuitionHub
          </span>
        </div>
      </div>
    </>
  );
}
