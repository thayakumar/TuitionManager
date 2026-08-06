import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Tuition Manager",
  description: "Personal tuition management — schedule, attendance, reports, invoices",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 p-8 max-w-6xl mx-auto w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
