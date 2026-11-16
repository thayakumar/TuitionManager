import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import { LayoutShell } from "@/components/layout-shell";
import { MainWrapper } from "@/components/main-wrapper";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TuitionHub",
  description: "Tuition management — schedule, attendance, reports, invoices",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TuitionHub",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d93624",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">
        <LayoutShell>
          <Nav />
          <MainWrapper>{children}</MainWrapper>
        </LayoutShell>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
