import { createClient } from "@/lib/supabase/server";
import {
  AddBookingButton,
  TenancyActions,
} from "@/components/tenancy-components";
import {
  formatDate,
  formatMoney,
  type Space,
  type Tenancy,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface BookingRow extends Tenancy {
  spaces: Pick<Space, "id" | "code" | "name"> | null;
}

// 8-week availability strip per short-term space.
function AvailabilityCalendar({
  spaces,
  bookings,
}: {
  spaces: Pick<Space, "id" | "code" | "name">[];
  bookings: BookingRow[];
}) {
  const DAYS = 56;
  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  const startMs = start.getTime();

  const clampPct = (n: number) => Math.max(0, Math.min(100, n));
  const todayPct = clampPct(((Date.now() - startMs) / (DAYS * dayMs)) * 100);

  // Week tick labels along the top.
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(startMs + i * 7 * dayMs);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const PHASE_BAR: Record<string, string> = {
    live: "bg-emerald-500",
    upcoming: "bg-sky-500",
    finished: "bg-slate-300",
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Availability — next 8 weeks</h2>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="ml-24 grid grid-cols-8 border-b border-slate-100 pb-1 text-[10px] text-slate-400">
            {weeks.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          {spaces.map((s) => {
            const spaceBookings = bookings.filter(
              (b) =>
                b.space_id === s.id &&
                !["ended", "terminated"].includes(b.status),
            );
            return (
              <div key={s.id} className="flex items-center gap-2 border-b border-slate-50 py-1.5">
                <span className="w-22 min-w-22 shrink-0 truncate text-xs font-medium text-slate-600" style={{ width: 88 }}>
                  {s.code}
                </span>
                <div className="relative h-6 flex-1 rounded bg-slate-50">
                  <span
                    className="absolute top-0 h-full w-px bg-rose-400"
                    style={{ left: `${todayPct}%` }}
                    title="Today"
                  />
                  {spaceBookings.map((b) => {
                    const bStart = new Date(b.start_date + "T00:00:00").getTime();
                    const bEnd = new Date(b.end_date + "T23:59:59").getTime();
                    if (bEnd < startMs || bStart > startMs + DAYS * dayMs) return null;
                    const left = clampPct(((bStart - startMs) / (DAYS * dayMs)) * 100);
                    const right = clampPct(((bEnd - startMs) / (DAYS * dayMs)) * 100);
                    const now = Date.now();
                    const phase = bEnd < now ? "finished" : bStart > now ? "upcoming" : "live";
                    return (
                      <span
                        key={b.id}
                        title={`${b.tenant_name}: ${b.start_date} → ${b.end_date}`}
                        className={`absolute top-0.5 flex h-5 items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white ${PHASE_BAR[phase]}`}
                        style={{ left: `${left}%`, width: `${Math.max(right - left, 2)}%` }}
                      >
                        <span className="truncate">{b.tenant_name}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        <span className="mr-3">🟩 live</span>
        <span className="mr-3">🟦 upcoming</span>
        <span>▌red line = today</span>
      </p>
    </section>
  );
}

export default async function BookingsPage() {
  const supabase = await createClient();
  const [{ data: bookings, error }, { data: spaces }] = await Promise.all([
    supabase
      .from("tenancies")
      .select("*, spaces(id, code, name)")
      .eq("tenancy_type", "licence")
      .order("start_date", { ascending: true }),
    supabase
      .from("spaces")
      .select("id, code, name, status, rate_daily")
      .in("space_type", ["kiosk", "atrium", "event_space"])
      .order("code"),
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load bookings.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const rows = (bookings ?? []) as BookingRow[];
  const today = new Date().toISOString().slice(0, 10);
  const live = rows.filter(
    (b) => b.status === "active" && b.start_date <= today && b.end_date >= today,
  );
  const upcoming = rows.filter(
    (b) => ["pending_signing", "active"].includes(b.status) && b.start_date > today,
  );
  const past = rows.filter(
    (b) => b.end_date < today || ["ended", "terminated"].includes(b.status),
  );

  function bookingPhase(b: BookingRow) {
    if (["ended", "terminated"].includes(b.status)) return b.status;
    if (b.end_date < today) return "finished";
    if (b.start_date > today) return "upcoming";
    return "live";
  }

  const PHASE_STYLES: Record<string, string> = {
    live: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    upcoming: "bg-sky-50 text-sky-700 ring-sky-200",
    finished: "bg-slate-100 text-slate-500 ring-slate-200",
    ended: "bg-slate-100 text-slate-500 ring-slate-200",
    terminated: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500">
            Short-term space use · {live.length} live now · {upcoming.length}{" "}
            upcoming · {past.length} past
          </p>
        </div>
        <AddBookingButton
          spaces={(spaces ?? []) as Pick<Space, "id" | "code" | "name" | "status" | "rate_daily">[]}
        />
      </div>

      {(spaces ?? []).length > 0 && (
        <AvailabilityCalendar
          spaces={(spaces ?? []) as Pick<Space, "id" | "code" | "name">[]}
          bookings={rows}
        />
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">🎪</p>
          <h2 className="mt-2 font-semibold text-slate-900">No bookings yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Book atrium, event space, or kiosk slots — directly here, or by
            accepting a short-term offer.
          </p>
          <div className="mt-4 flex justify-center">
            <AddBookingButton
              spaces={(spaces ?? []) as Pick<Space, "id" | "code" | "name" | "status" | "rate_daily">[]}
            />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant / event</th>
                <th className="px-4 py-3 font-medium">Space</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Licence fee</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => {
                const phase = bookingPhase(b);
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {b.tenant_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {b.spaces ? `${b.spaces.code} · ${b.spaces.name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(b.start_date)} → {formatDate(b.end_date)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatMoney(b.fee_total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${PHASE_STYLES[phase] ?? PHASE_STYLES.finished}`}
                      >
                        {phase}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TenancyActions tenancyId={b.id} status={b.status} />
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
