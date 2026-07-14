"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/leads");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to manage enquiries, offers, and tenancies.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </label>
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
