import type { Metadata } from "next";
import Link from "next/link";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientHub — Sales Pipeline & Performance",
  description:
    "Track leads, follow-ups, conversions, and business performance in one workspace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <ToastProvider>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center gap-6">
            <Link href="/leads" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">
                C
              </span>
              ClientHub
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/leads"
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Pipeline
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/deals"
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Deals
              </Link>
            </nav>
            <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Demo workspace
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
