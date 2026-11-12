"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function NotificationBell({
  unreadCount,
  href,
}: {
  unreadCount: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
