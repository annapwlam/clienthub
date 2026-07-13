import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TenancyActions } from "@/components/tenancy-components";
import {
  TENANCY_STATUS_LABELS,
  formatDate,
  formatMoney,
  type Space,
  type Tenancy,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface TenancyRow extends Tenancy {
  spaces: Pick<Space, "id" | "code" | "name"> | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending_signing: "bg-sky-50 text-sky-700 ring-sky-200",
  fitout: "bg-violet-50 text-violet-700 ring-violet-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ended: "bg-slate-100 text-slate-500 ring-slate-200",
  terminated: "bg-rose-50 text-rose-700 ring-rose-200",
};

function daysUntil(date: string) {
  return Math.ceil(
    (new Date(date + "T00:00:00").getTime() - Date.now()) / 86_400_000,
  );
}

export default async function TenanciesPage() {
  const supabase = await createClient();
  const { data: tenancies, error } = await supabase
    .from("tenancies")
    .select("*, spaces(id, code, name)")
    .eq("tenancy_type", "lease")
    .order("end_date", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load tenancies.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const rows = (tenancies ?? []) as TenancyRow[];
  const active = rows.filter((t) => t.status === "active");
  const expiringSoon = active.filter((t) => daysUntil(t.end_date) <= 90);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tenancies</h1>
        <p className="text-sm text-slate-500">
          {active.length} active lease{active.length === 1 ? "" : "s"} ·{" "}
          {expiringSoon.length} expiring within 90 days
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">📄</p>
          <h2 className="mt-2 font-semibold text-slate-900">No leases yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Accept a long-term offer on the Offers tab and the lease appears
            here for signing, fit-out, and activation.
          </p>
          <Link
            href="/offers"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to offers
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Space</th>
                <th className="px-4 py-3 font-medium">Term</th>
                <th className="px-4 py-3 font-medium">Rent</th>
                <th className="px-4 py-3 font-medium">Deposit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => {
                const days = daysUntil(t.end_date);
                const expiring = t.status === "active" && days <= 90;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {t.tenant_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.spaces ? t.spaces.code : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(t.start_date)} → {formatDate(t.end_date)}
                      {expiring && (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          ⏳ {days}d left — renew?
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatMoney(t.rent_monthly)}/mo
                    </td>
                    <td className="px-4 py-3">{formatMoney(t.deposit)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[t.status] ?? STATUS_STYLES.ended}`}
                      >
                        {TENANCY_STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TenancyActions tenancyId={t.id} status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
