"use client";
import { useEffect, useState } from "react";
type ChatRole = "admin" | "student" | "parent";
function query(role:ChatRole,parentToken?:string){ const q=new URLSearchParams({viewer:role,summary:"1"});if(parentToken)q.set("parentToken",parentToken);return q;}
export function useUnreadFamilyChats(role: ChatRole, parentToken?: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true, pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      try { const r = await fetch("/api/chats?" + query(role, parentToken), { cache: "no-store", signal: controller.signal }); if (r.ok) { const data = await r.json(); if (live) setCount(Number(data.unreadCount || 0)); } } catch { /* Retain last confirmed count on a transient failure. */ } finally { pending = false; }
    }
    void refresh(); const timer = setInterval(() => void refresh(), 15000);
    const update = () => void refresh();
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update); window.addEventListener("family-chats-changed", update);
    return () => { live = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); window.removeEventListener("family-chats-changed", update); };
  }, [role, parentToken]);
  return count;
}

