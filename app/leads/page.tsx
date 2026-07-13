import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddLeadButton } from "@/components/add-lead-form";
import { ScoreBadge } from "@/components/badges";
import {
  STAGES,
  STAGE_LABELS,
  formatMoney,
  type Lead,
  type Space,
  type Stage,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMN_ACCENT: Record<Stage, string> = {
  new: "border-t-sky-400",
  qualified: "border-t-violet-400",
  viewing: "border-t-cyan-400",
  proposal: "border-t-amber-400",
  negotiation: "border-t-orange-400",
  won: "border-t-emerald-400",
  lost: "border-t-rose-400",
};

function LeadCard({ lead }: { lead: Lead }) {
  const overdue =
    lead.next_action_date &&
    !["won", "lost"].includes(lead.stage) &&
    new Date(lead.next_action_date + "T23:59:59") < new Date();
  const shortTerm = lead.enquiry_type === "short_term";
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {lead.brand_name || lead.company || lead.full_name}
          </p>
          <p className="truncate text-xs text-slate-500">{lead.full_name}</p>
        </div>
        <ScoreBadge score={lead.score} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">
          {formatMoney(lead.deal_value, lead.currency ?? "USD")}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            shortTerm
              ? "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200"
              : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
          }`}
        >
          {shortTerm ? "Short-term" : "Long-term"}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
        <span className="truncate">{lead.owner_name ?? "Unassigned"}</span>
        {overdue && (
          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
            ⏰ Overdue
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const sortByScore = sort === "score";
  const supabase = await createClient();
  const [{ data: leads, error }, { data: spaces }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .order(sortByScore ? "score" : "created_at", {
        ascending: false,
        nullsFirst: false,
      }),
    supabase.from("spaces").select("*").order("code"),
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load enquiries.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const byStage = new Map<Stage, Lead[]>(STAGES.map((s) => [s, []]));
  for (const lead of (leads ?? []) as Lead[]) {
    (byStage.get(lead.stage) ?? byStage.get("new"))!.push(lead);
  }

  const total = leads?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Enquiries</h1>
          <p className="text-sm text-slate-500">
            {total} enquir{total === 1 ? "y" : "ies"} · first approach → signed
            tenancy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={sortByScore ? "/leads" : "/leads?sort=score"}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              sortByScore
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {sortByScore ? "✓ Sorted by score" : "Sort by score"}
          </Link>
          <AddLeadButton spaces={(spaces ?? []) as Space[]} />
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">📇</p>
          <h2 className="mt-2 font-semibold text-slate-900">No enquiries yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Log the first approach — walk-in, call, or email — and track it
            through to a signed tenancy.
          </p>
          <div className="mt-4 flex justify-center">
            <AddLeadButton spaces={(spaces ?? []) as Space[]} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {STAGES.map((stage) => {
            const items = byStage.get(stage)!;
            return (
              <section
                key={stage}
                className={`rounded-xl border border-slate-200 border-t-4 ${COLUMN_ACCENT[stage]} bg-slate-100/60 p-2`}
              >
                <header className="flex items-center justify-between px-1 py-1.5">
                  <h2 className="text-sm font-semibold text-slate-700">
                    {STAGE_LABELS[stage]}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                    {items.length}
                  </span>
                </header>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                      No enquiries
                    </p>
                  ) : (
                    items.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
