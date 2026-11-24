import "./globals.css";
import type { Metadata, Viewport } from "next";
import {NotificationProvider} from "@/components/notification-provider";
import Nav from "@/components/Nav";
import { BusyProvider } from "@/components/action-busy";
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
  icons: {
    icon: [
      {url: "/favicon.ico", sizes: "any"},
      {url: "/favicon.svg", type: "image/svg+xml", sizes: "any"},
    ],
    shortcut: "/favicon.ico",
    apple: [{url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png"}],
  },
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
        <BusyProvider>
          <NotificationProvider>
          <LayoutShell>
            <Nav />
            <MainWrapper>{children}</MainWrapper>
          </LayoutShell>
          <Toaster richColors position="top-right" closeButton />
          </NotificationProvider>
        </BusyProvider>
      </body>
    </html>
  );
}
