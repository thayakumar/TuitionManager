"use client";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhatsAppShare({ text }: { text: string }) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <Button variant="outline" onClick={() => window.open(url, "_blank")} className="gap-1.5">
      <MessageCircle size={16} /> WhatsApp
    </Button>
  );
}
