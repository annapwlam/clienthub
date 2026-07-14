import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InviteMemberForm } from "@/components/team-components";

export const dynamic = "force-dynamic";

interface MembershipRow {
  id: string;
  user_id: string | null;
  role: string;
  invited_email: string | null;
  created_at: string;
  teams: { name: string } | null;
}

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  manager: "bg-violet-50 text-violet-700 ring-violet-200",
  rep: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-3xl">🔐</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to see your team and roles.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("id, user_id, role, invited_email, created_at, teams(name)")
    .order("created_at");

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load the team.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
        <p className="mt-3 text-xs text-rose-500">
          If this mentions a missing column, apply
          supabase/migrations/0004_lockdown.sql in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  const rows = (memberships ?? []) as unknown as MembershipRow[];
  const myRow = rows.find((m) => m.user_id === user.id);
  const myRole = myRow?.role ?? "rep";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Team</h1>
        <p className="text-sm text-slate-500">
          You are signed in as <span className="font-medium">{user.email}</span>{" "}
          <span
            className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${ROLE_STYLES[myRole]}`}
          >
            {myRole}
          </span>
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Invite a teammate</h2>
        <p className="mt-1 text-xs text-slate-500">
          Admins only. The invite is linked automatically when they sign up with
          this email. Reps see their own book; managers and admins see the whole
          team&apos;s.
        </p>
        <div className="mt-4">
          <InviteMemberForm />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Members &amp; invites</h2>
        {rows.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
            No memberships visible. Reps only see their own row — managers and
            admins see everyone.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Team</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      {m.invited_email ?? (m.user_id === user.id ? user.email : m.user_id)}
                      {m.user_id === user.id && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{m.teams?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${ROLE_STYLES[m.role] ?? ROLE_STYLES.rep}`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {m.user_id ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                          active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                          invited
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
