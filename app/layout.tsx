import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import { Poppins, Open_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Tuition Manager",
  description: "Personal tuition management — schedule, attendance, reports, invoices",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tuition Manager",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0D9488",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(poppins.variable, openSans.variable)}>
      <body className="antialiased font-sans">
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 p-8 max-w-6xl mx-auto w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
