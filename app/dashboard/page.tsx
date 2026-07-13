import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageBadge } from "@/components/badges";
import {
  OPEN_STAGES,
  STAGES,
  STAGE_LABELS,
  STAGE_WEIGHTS,
  formatDate,
  formatMoney,
  type Lead,
  type Stage,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "warning";
}) {
  const valueColor =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-rose-600"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: leads, error }, spacesRes, tenanciesRes] = await Promise.all([
    supabase.from("leads").select("*"),
    supabase.from("spaces").select("*"),
    supabase.from("tenancies").select("*, spaces(code)"),
  ]);
  // Leasing tables may not exist until migration 0002 is applied — degrade
  // gracefully to the classic pipeline dashboard rather than erroring.
  const spaces = (spacesRes.error ? [] : (spacesRes.data ?? [])) as import("@/lib/types").Space[];
  const tenancies = (tenanciesRes.error
    ? []
    : (tenanciesRes.data ?? [])) as (import("@/lib/types").Tenancy & {
    spaces: { code: string } | null;
  })[];
  const leasingReady = !spacesRes.error;

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load the dashboard.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const all = (leads ?? []) as Lead[];
  const countByStage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
    Stage,
    number
  >;
  for (const lead of all) {
    if (lead.stage in countByStage) countByStage[lead.stage] += 1;
  }

  const won = countByStage.won;
  const lost = countByStage.lost;
  const closed = won + lost;
  const winRate = closed === 0 ? 0 : Math.round((won / closed) * 100);

  // Weighted forecast over open pipeline only.
  const forecast = all
    .filter((l) => OPEN_STAGES.includes(l.stage))
    .reduce(
      (sum, l) => sum + (l.deal_value ?? 0) * (STAGE_WEIGHTS[l.stage] ?? 0),
      0,
    );

  const wonValue = all
    .filter((l) => l.stage === "won")
    .reduce((sum, l) => sum + (l.deal_value ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = all
    .filter(
      (l) =>
        OPEN_STAGES.includes(l.stage) &&
        l.next_action_date != null &&
        l.next_action_date < today,
    )
    .sort((a, b) => (a.next_action_date! < b.next_action_date! ? -1 : 1));

  const winsByOwner = new Map<string, { wins: number; value: number }>();
  for (const l of all) {
    if (l.stage !== "won") continue;
    const owner = l.owner_name ?? "Unassigned";
    const entry = winsByOwner.get(owner) ?? { wins: 0, value: 0 };
    entry.wins += 1;
    entry.value += l.deal_value ?? 0;
    winsByOwner.set(owner, entry);
  }
  const topPerformers = [...winsByOwner.entries()].sort(
    (a, b) => b[1].wins - a[1].wins || b[1].value - a[1].value,
  );

  const empty = all.length === 0;

  // ── Leasing metrics (0002) ──
  const todayStr = new Date().toISOString().slice(0, 10);
  const leasable = spaces.filter((s) => s.status !== "maintenance");
  const occupancyRate =
    leasable.length === 0
      ? 0
      : Math.round(
          (leasable.filter((s) => s.status === "occupied").length /
            leasable.length) *
            100,
        );
  const activeLeases = tenancies.filter(
    (t) => t.tenancy_type === "lease" && t.status === "active",
  );
  const expiring = activeLeases
    .filter(
      (t) =>
        (new Date(t.end_date + "T00:00:00").getTime() - Date.now()) / 86_400_000 <=
        90,
    )
    .sort((a, b) => (a.end_date < b.end_date ? -1 : 1));
  const upcomingBookings = tenancies
    .filter(
      (t) =>
        t.tenancy_type === "licence" &&
        ["pending_signing", "active"].includes(t.status) &&
        t.end_date >= todayStr,
    )
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
    .slice(0, 6);
  const recurringRent = activeLeases.reduce(
    (sum, t) => sum + (t.rent_monthly ?? 0),
    0,
  );
  const longCount = all.filter((l) => l.enquiry_type !== "short_term").length;
  const shortCount = all.filter((l) => l.enquiry_type === "short_term").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Live pipeline health, computed from the database on every load.
        </p>
      </div>

      {empty ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">📊</p>
          <h2 className="mt-2 font-semibold text-slate-900">No data yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Metrics will appear here as soon as your pipeline has leads.
          </p>
          <Link
            href="/leads"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Add your first lead
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Enquiries"
              value={String(all.length)}
              hint={`${longCount} long-term · ${shortCount} short-term`}
            />
            <StatCard
              label="Conversion rate"
              value={`${winRate}%`}
              hint={`${won} signed / ${lost} lost`}
              tone={winRate >= 50 ? "positive" : "default"}
            />
            <StatCard
              label="Revenue forecast"
              value={formatMoney(Math.round(forecast))}
              hint="Open pipeline × stage probability"
            />
            <StatCard
              label="Signed value"
              value={formatMoney(wonValue)}
              hint={`across ${won} signed enquir${won === 1 ? "y" : "ies"}`}
              tone="positive"
            />
          </div>

          {leasingReady && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Occupancy"
                value={`${occupancyRate}%`}
                hint={`${leasable.filter((s) => s.status === "occupied").length} of ${leasable.length} leasable spaces`}
                tone={occupancyRate >= 80 ? "positive" : "default"}
              />
              <StatCard
                label="Recurring rent"
                value={`${formatMoney(recurringRent)}/mo`}
                hint={`${activeLeases.length} active lease${activeLeases.length === 1 ? "" : "s"}`}
                tone="positive"
              />
              <StatCard
                label="Expiring ≤ 90 days"
                value={String(expiring.length)}
                hint="Active leases needing renewal talks"
                tone={expiring.length > 0 ? "warning" : "default"}
              />
              <StatCard
                label="Short-term bookings"
                value={String(upcomingBookings.length)}
                hint="Live or upcoming licences"
              />
            </div>
          )}

          {leasingReady && (expiring.length > 0 || upcomingBookings.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">
                  Renewal radar{" "}
                  {expiring.length > 0 && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {expiring.length}
                    </span>
                  )}
                </h2>
                {expiring.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                    No leases expiring in the next 90 days.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {expiring.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{t.tenant_name}</p>
                          <p className="text-xs text-slate-500">
                            {t.spaces?.code ?? "—"} · {formatMoney(t.rent_monthly)}/mo
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-amber-600">
                          ends {formatDate(t.end_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Upcoming short-term use</h2>
                {upcomingBookings.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                    No live or upcoming bookings.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {upcomingBookings.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{t.tenant_name}</p>
                          <p className="text-xs text-slate-500">
                            {t.spaces?.code ?? "—"} · {formatMoney(t.fee_total)}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDate(t.start_date)} → {formatDate(t.end_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="font-semibold text-slate-900">Pipeline by stage</h2>
              <ul className="mt-4 space-y-2.5">
                {STAGES.map((stage) => {
                  const count = countByStage[stage];
                  const pct = all.length === 0 ? 0 : (count / all.length) * 100;
                  return (
                    <li key={stage} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-sm text-slate-600">
                        {STAGE_LABELS[stage]}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-sm font-semibold text-slate-700">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
              <h2 className="font-semibold text-slate-900">
                Overdue follow-ups{" "}
                {overdue.length > 0 && (
                  <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    {overdue.length}
                  </span>
                )}
              </h2>
              {overdue.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                  Nothing overdue — every open lead has a future next action. 🎯
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {overdue.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/leads/${l.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {l.company || l.full_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {l.owner_name ?? "Unassigned"} ·{" "}
                            {formatMoney(l.deal_value, l.currency ?? "USD")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StageBadge stage={l.stage} />
                          <span className="text-xs font-medium text-rose-600">
                            due {formatDate(l.next_action_date)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Top performers</h2>
            {topPerformers.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                No wins yet — the leaderboard starts with the first Won lead.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="py-2 pr-4 font-medium">#</th>
                      <th className="py-2 pr-4 font-medium">Owner</th>
                      <th className="py-2 pr-4 font-medium">Wins</th>
                      <th className="py-2 font-medium">Won value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topPerformers.map(([owner, stats], i) => (
                      <tr key={owner}>
                        <td className="py-2.5 pr-4 text-slate-400">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{owner}</td>
                        <td className="py-2.5 pr-4">{stats.wins}</td>
                        <td className="py-2.5 font-semibold">{formatMoney(stats.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
