"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthNav({ email }: { email: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setPending(false);
    router.push("/leads");
    router.refresh();
  }

  if (!email) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 sm:inline-flex">
          👀 View-only demo
        </span>
        <Link
          href="/login"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="hidden max-w-[180px] truncate text-xs font-medium text-slate-500 sm:inline">
        {email}
      </span>
      <button
        onClick={signOut}
        disabled={pending}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Sign out
      </button>
    </div>
  );
}
