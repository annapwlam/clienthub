import { createClient } from "@/lib/supabase/server";
import { AddSpaceButton, SpaceStatusSelect } from "@/components/space-components";
import { SPACE_TYPE_LABELS, formatMoney, type Space, type Tenancy } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_ICON: Record<string, string> = {
  unit: "🏬",
  kiosk: "🛒",
  atrium: "🎪",
  event_space: "🎫",
};

export default async function SpacesPage() {
  const supabase = await createClient();
  const [{ data: spaces, error }, { data: tenancies }] = await Promise.all([
    supabase.from("spaces").select("*").order("code"),
    supabase
      .from("tenancies")
      .select("*")
      .in("status", ["pending_signing", "fitout", "active"]),
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load spaces.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
        <p className="mt-3 text-xs text-rose-500">
          If this says the table doesn&apos;t exist, apply
          supabase/migrations/0002_mall_leasing.sql in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  const rows = (spaces ?? []) as Space[];
  const occupants = new Map<string, Tenancy>();
  for (const t of (tenancies ?? []) as Tenancy[]) {
    if (t.space_id) occupants.set(t.space_id, t);
  }

  const vacant = rows.filter((s) => s.status === "vacant").length;
  const leasable = rows.filter((s) => s.status !== "maintenance").length;
  const occupancy =
    leasable === 0
      ? 0
      : Math.round(
          (rows.filter((s) => s.status === "occupied").length / leasable) * 100,
        );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Spaces</h1>
          <p className="text-sm text-slate-500">
            {rows.length} spaces · {vacant} vacant · {occupancy}% occupancy
          </p>
        </div>
        <AddSpaceButton />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">🏢</p>
          <h2 className="mt-2 font-semibold text-slate-900">No spaces yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Add your mall&apos;s leasable inventory — retail units, kiosks,
            atrium and event spaces.
          </p>
          <div className="mt-4 flex justify-center">
            <AddSpaceButton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => {
            const tenant = occupants.get(s.id);
            return (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{TYPE_ICON[s.space_type] ?? "🏬"}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{s.code}</p>
                      <p className="text-xs text-slate-500">{s.name}</p>
                    </div>
                  </div>
                  <SpaceStatusSelect spaceId={s.id} status={s.status} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-slate-400">Type</dt>
                    <dd className="font-medium text-slate-700">
                      {SPACE_TYPE_LABELS[s.space_type] ?? s.space_type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Floor / zone</dt>
                    <dd className="font-medium text-slate-700">
                      {s.floor ?? "—"} · {s.zone ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Size</dt>
                    <dd className="font-medium text-slate-700">
                      {s.size_sqft ? `${s.size_sqft} sqft` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Monthly rent</dt>
                    <dd className="font-medium text-slate-700">
                      {s.rent_monthly ? formatMoney(s.rent_monthly) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Daily rate</dt>
                    <dd className="font-medium text-slate-700">
                      {s.rate_daily ? formatMoney(s.rate_daily) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Current tenant</dt>
                    <dd className="truncate font-medium text-slate-700">
                      {tenant ? tenant.tenant_name : "—"}
                    </dd>
                  </div>
                </dl>
                {s.suitable_for && (
                  <p className="mt-2.5 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                    Suitable for: {s.suitable_for}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
