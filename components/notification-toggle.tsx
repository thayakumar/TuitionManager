"use client";
import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      new Notification("Tuition Manager", {
        body: "Class reminders are now enabled!",
        icon: "/icon-192.svg",
      });
    }
  }

  if (!supported) return null;

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">Class reminders</div>
        <div className="text-xs text-muted-foreground">
          {permission === "granted"
            ? "Browser notifications are enabled"
            : permission === "denied"
              ? "Notifications are blocked in browser settings"
              : "Get notified before upcoming classes"}
        </div>
      </div>
      <Button
        variant={permission === "granted" ? "secondary" : "outline"}
        onClick={requestPermission}
        disabled={permission === "denied"}
      >
        {permission === "granted" ? <Bell size={16} /> : <BellOff size={16} />}
        {permission === "granted" ? "Enabled" : "Enable"}
      </Button>
    </div>
  );
}
