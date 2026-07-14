import { createClient } from "@/lib/supabase/server";
import {
  AddProjectButton,
  LogTimeForm,
  ProjectOutcomeForm,
} from "@/components/project-components";
import {
  formatDate,
  formatMoney,
  tenancyRevenue,
  type Project,
  type Space,
  type Tenancy,
  type TimeEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface ProjectRow extends Project {
  tenancies:
    | (Pick<
        Tenancy,
        "id" | "tenant_name" | "tenancy_type" | "start_date" | "end_date" | "rent_monthly" | "fee_total"
      > & { spaces: Pick<Space, "code"> | null })
    | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-sky-50 text-sky-700 ring-sky-200",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [{ data: projects, error }, { data: entries }, { data: tenancies }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          "*, tenancies(id, tenant_name, tenancy_type, start_date, end_date, rent_monthly, fee_total, spaces(code))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("time_entries")
        .select("*")
        .order("entry_date", { ascending: false }),
      supabase
        .from("tenancies")
        .select("id, tenant_name, start_date, end_date, spaces(code)")
        .in("status", ["pending_signing", "fitout", "active"])
        .order("start_date"),
    ]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load projects.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
        <p className="mt-3 text-xs text-rose-500">
          If this says the table doesn&apos;t exist, apply
          supabase/migrations/0006_projects_profitability.sql in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  const rows = (projects ?? []) as unknown as ProjectRow[];
  const allEntries = (entries ?? []) as TimeEntry[];
  const hoursByProject = new Map<string, number>();
  for (const e of allEntries) {
    if (e.project_id)
      hoursByProject.set(e.project_id, (hoursByProject.get(e.project_id) ?? 0) + e.hours);
  }

  const tenancyOptions = (
    (tenancies ?? []) as unknown as (Pick<Tenancy, "id" | "tenant_name" | "start_date" | "end_date"> & {
      spaces: { code: string } | null;
    })[]
  ).map((t) => ({
    id: t.id,
    label: `${t.tenant_name} · ${t.spaces?.code ?? "—"} (${t.start_date} → ${t.end_date})`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">
            Fit-out and operations work per tenancy — hours, cost, margin, and
            customer outcome.
          </p>
        </div>
        <AddProjectButton tenancies={tenancyOptions} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">🛠️</p>
          <h2 className="mt-2 font-semibold text-slate-900">No projects yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Create a project against a tenancy to track fit-out hours, cost vs
            budget, and profitability.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => {
            const hours = hoursByProject.get(p.id) ?? 0;
            const hoursPct = p.budget_hours
              ? Math.min(100, Math.round((hours / p.budget_hours) * 100))
              : null;
            const revenue = p.tenancies ? tenancyRevenue(p.tenancies) : 0;
            const cost = p.actual_cost ?? 0;
            const margin = revenue - cost;
            const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : null;
            const projectEntries = allEntries.filter((e) => e.project_id === p.id).slice(0, 5);
            return (
              <section key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{p.name}</h2>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[p.status] ?? STATUS_STYLES.active}`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                      {p.churn_risk && (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                          ⚠ churn risk
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {p.tenancies
                        ? `${p.tenancies.tenant_name} · ${p.tenancies.spaces?.code ?? "—"}`
                        : "No tenancy linked"}
                      {p.satisfaction_score ? ` · ${"★".repeat(p.satisfaction_score)}` : ""}
                    </p>
                  </div>
                  <dl className="grid grid-cols-4 gap-x-6 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Revenue</dt>
                      <dd className="font-semibold text-slate-900">{formatMoney(revenue)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Cost / budget</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatMoney(cost)}
                        <span className="font-normal text-slate-400"> / {formatMoney(p.budget_cost)}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Margin</dt>
                      <dd className={`font-semibold ${margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatMoney(margin)}
                        {marginPct != null && (
                          <span className="font-normal text-slate-400"> ({marginPct}%)</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Hours / budget</dt>
                      <dd className="font-semibold text-slate-900">
                        {hours}
                        <span className="font-normal text-slate-400">
                          {" "}
                          / {p.budget_hours ?? "—"}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                {hoursPct != null && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${hoursPct >= 100 ? "bg-rose-500" : "bg-indigo-500"}`}
                      style={{ width: `${hoursPct}%` }}
                    />
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Log time
                    </h3>
                    <div className="mt-2">
                      <LogTimeForm projectId={p.id} />
                    </div>
                    {projectEntries.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-slate-500">
                        {projectEntries.map((e) => (
                          <li key={e.id}>
                            {formatDate(e.entry_date)} · <span className="font-medium text-slate-700">{e.hours}h</span> · {e.rep ?? "—"}
                            {e.description ? ` — ${e.description}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Status, cost &amp; customer outcome
                    </h3>
                    <div className="mt-2">
                      <ProjectOutcomeForm project={p} />
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
