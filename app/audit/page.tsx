import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  actor: string | null;
  action: string;
  target_table: string | null;
  risk_level: string | null;
  approval_status: string | null;
  approved_by: string | null;
  created_at: string;
}

const RISK_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 ring-slate-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  critical: "bg-rose-600 text-white ring-rose-700",
};

const APPROVAL_STYLES: Record<string, string> = {
  auto: "bg-slate-100 text-slate-500 ring-slate-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-3xl">📜</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in as a manager or admin to view the audit trail.</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Sign in
        </Link>
      </div>
    );
  }

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("id, actor, action, target_table, risk_level, approval_status, approved_by, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load the audit log.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const rows = (logs ?? []) as AuditRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">
          Every significant action, append-only. Visible to managers and admins.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">📜</p>
          <h2 className="mt-2 font-semibold text-slate-900">Nothing visible</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            The audit trail is restricted to managers and admins. If you should
            have access, ask an admin to upgrade your role on the Team page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Approval</th>
                <th className="px-4 py-3 font-medium">Approved by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {new Date(r.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-2.5 text-slate-700">{r.actor ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.action}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.target_table ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${RISK_STYLES[r.risk_level ?? "low"] ?? RISK_STYLES.low}`}>
                      {r.risk_level ?? "low"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${APPROVAL_STYLES[r.approval_status ?? "auto"] ?? APPROVAL_STYLES.auto}`}>
                      {r.approval_status ?? "auto"}
                    </span>
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-2.5 text-slate-500">{r.approved_by ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
