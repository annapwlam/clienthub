import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, type Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

interface DealRow extends Deal {
  leads: { id: string; full_name: string; company: string | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  completed: "bg-sky-50 text-sky-700 ring-sky-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*, leads(id, full_name, company)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load deals.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const rows = (deals ?? []) as DealRow[];
  const totalValue = rows.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Deals</h1>
        <p className="text-sm text-slate-500">
          {rows.length} deal{rows.length === 1 ? "" : "s"} ·{" "}
          {formatMoney(totalValue)} total value
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">🤝</p>
          <h2 className="mt-2 font-semibold text-slate-900">No deals yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Mark a lead as Won on the pipeline board and it will show up here
            automatically.
          </p>
          <Link
            href="/leads"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to pipeline
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Deal</th>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Margin</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.title}</td>
                  <td className="px-4 py-3">
                    {d.leads ? (
                      <Link
                        href={`/leads/${d.leads.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {d.leads.company || d.leads.full_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatMoney(d.value, d.currency ?? "USD")}
                  </td>
                  <td className="px-4 py-3">
                    {d.margin != null ? formatMoney(d.margin, d.currency ?? "USD") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[d.status] ?? STATUS_STYLES.cancelled}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(d.closed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
