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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
];

const systemLinks = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
        active
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

function NavSection({
  title,
  links,
  pathname,
}: {
  title: string;
  links: typeof overviewLinks;
  pathname: string;
}) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {title}
      </div>
      {links.map((l) => {
        const active =
          l.href === "/"
            ? pathname === "/"
            : pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} active={active} />
        );
      })}
    </div>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-foreground">
              Tuition Manager
            </div>
            <div className="text-[11px] text-muted-foreground">
              Personal tutoring HQ
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-6 px-3 py-4">
        <NavSection title="Overview" links={overviewLinks} pathname={pathname} />
        <NavSection title="Management" links={managementLinks} pathname={pathname} />
        <NavSection title="System" links={systemLinks} pathname={pathname} />
      </nav>

      <Separator />

      <div className="px-4 py-3">
        <div className="text-[10px] text-muted-foreground/50">
          v1.0 &middot; Turso cloud
        </div>
      </div>
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print hidden md:flex w-60 shrink-0 border-r border-border bg-card h-screen sticky top-0 flex-col">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile hamburger */}
      <div className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon-sm" />
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
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap size={14} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Tuition Manager
          </span>
        </div>
      </div>
    </>
  );
}
