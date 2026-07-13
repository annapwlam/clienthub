import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreBadge, StageBadge } from "@/components/badges";
import {
  EditLeadInline,
  FollowUpForm,
  WonLostButtons,
} from "@/components/lead-detail-actions";
import {
  OUTCOME_LABELS,
  SOURCE_LABELS,
  formatDate,
  formatMoney,
  type Activity,
  type FollowUp,
  type Lead,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTIVITY_ICONS: Record<string, string> = {
  lead_created: "✨",
  stage_change: "↗️",
  follow_up_logged: "📞",
  lead_won: "🏆",
  lead_lost: "🚫",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!lead) notFound();

  const [{ data: followUps }, { data: activities }, { data: deal }] =
    await Promise.all([
      supabase
        .from("follow_ups")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("activities")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("deals")
        .select("id, title, value, currency, status")
        .eq("lead_id", id)
        .maybeSingle(),
    ]);

  const l = lead as Lead;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Back to pipeline
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {l.company || l.full_name}
            </h1>
            <StageBadge stage={l.stage} />
            <ScoreBadge score={l.score} />
          </div>
          {l.company && <p className="mt-0.5 text-slate-500">{l.full_name}</p>}
        </div>
        <WonLostButtons lead={l} />
      </div>

      {l.stage === "lost" && l.lost_reason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="font-semibold">Lost reason:</span> {l.lost_reason}
        </div>
      )}
      {l.stage === "won" && deal && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="font-semibold">Won 🎉</span> Deal created:{" "}
          <Link href="/deals" className="font-medium underline">
            {deal.title}
          </Link>{" "}
          ({formatMoney(deal.value, deal.currency ?? "USD")}, {deal.status})
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Details</h2>
          <EditLeadInline lead={l} />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</dt>
            <dd className="mt-0.5 text-slate-800">{l.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</dt>
            <dd className="mt-0.5 text-slate-800">{l.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Source</dt>
            <dd className="mt-0.5 text-slate-800">
              {l.source ? (SOURCE_LABELS[l.source] ?? l.source) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Owner</dt>
            <dd className="mt-0.5 text-slate-800">{l.owner_name ?? "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Deal value
            </dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {formatMoney(l.deal_value, l.currency ?? "USD")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Next action
            </dt>
            <dd className="mt-0.5 text-slate-800">{formatDate(l.next_action_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Created</dt>
            <dd className="mt-0.5 text-slate-800">{formatDate(l.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Score confidence
            </dt>
            <dd className="mt-0.5 text-slate-800">
              {l.score_confidence != null
                ? `${Math.round(l.score_confidence * 100)}% · ${l.score_source ?? ""}`
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Follow-ups</h2>
          <div className="mt-4">
            <FollowUpForm leadId={l.id} />
          </div>
          <ul className="mt-5 space-y-3">
            {(followUps ?? []).length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                No follow-ups yet — log your first touch above.
              </li>
            )}
            {((followUps ?? []) as FollowUp[]).map((f) => (
              <li key={f.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-800">{f.note}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2 py-0.5 font-medium ring-1 ring-slate-200">
                    {f.outcome ? (OUTCOME_LABELS[f.outcome] ?? f.outcome) : "—"}
                  </span>
                  <span>Contacted {formatDate(f.contacted_at ?? f.created_at)}</span>
                  {f.next_action_date && <span>Next: {formatDate(f.next_action_date)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Activity</h2>
          <ul className="mt-4 space-y-3">
            {(activities ?? []).length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                No activity recorded yet.
              </li>
            )}
            {((activities ?? []) as Activity[]).map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-0.5 text-base">
                  {ACTIVITY_ICONS[a.action_type] ?? "•"}
                </span>
                <div>
                  <p className="text-sm text-slate-800">{a.description}</p>
                  <p className="text-xs text-slate-400">
                    {a.performed_by ?? "system"} ·{" "}
                    {new Date(a.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
