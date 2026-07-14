import type { Metadata } from "next";
import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import { ToastProvider } from "@/components/toast";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientHub — Sales Pipeline & Performance",
  description:
    "Track leads, follow-ups, conversions, and business performance in one workspace.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
            <nav className="flex items-center gap-0.5 overflow-x-auto text-sm">
              {[
                ["/leads", "Enquiries"],
                ["/spaces", "Spaces"],
                ["/viewings", "Viewings"],
                ["/offers", "Offers"],
                ["/tenancies", "Tenancies"],
                ["/bookings", "Bookings"],
                ["/billing", "Billing"],
                ["/projects", "Projects"],
                ["/dashboard", "Dashboard"],
                ["/agent", "Agent"],
                ["/audit", "Audit"],
                ["/team", "Team"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <AuthNav email={user?.email ?? null} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
