import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ScheduleViewingButton,
  ViewingActions,
} from "@/components/viewing-components";
import type { Lead, Space, Viewing } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ViewingRow extends Viewing {
  leads: Pick<Lead, "id" | "full_name" | "brand_name" | "company"> | null;
  spaces: Pick<Space, "id" | "code" | "name"> | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-sky-50 text-sky-700 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  no_show: "bg-amber-50 text-amber-700 ring-amber-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export default async function ViewingsPage() {
  const supabase = await createClient();
  const [{ data: viewings, error }, { data: leads }, { data: spaces }] =
    await Promise.all([
      supabase
        .from("viewings")
        .select("*, leads(id, full_name, brand_name, company), spaces(id, code, name)")
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, full_name, brand_name, company")
        .not("stage", "in", "(won,lost)")
        .order("created_at", { ascending: false }),
      supabase.from("spaces").select("id, code, name, status").order("code"),
    ]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load viewings.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const rows = (viewings ?? []) as ViewingRow[];
  const upcoming = rows.filter(
    (v) => v.status === "scheduled" && new Date(v.scheduled_at) >= new Date(),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Viewings</h1>
          <p className="text-sm text-slate-500">
            {upcoming.length} upcoming site visit{upcoming.length === 1 ? "" : "s"}
          </p>
        </div>
        <ScheduleViewingButton
          leads={(leads ?? []) as Pick<Lead, "id" | "full_name" | "brand_name" | "company">[]}
          spaces={(spaces ?? []) as Pick<Space, "id" | "code" | "name" | "status">[]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">📅</p>
          <h2 className="mt-2 font-semibold text-slate-900">No viewings yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Schedule a site visit for an enquiry — it moves the enquiry to the
            Viewing stage automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Enquiry</th>
                <th className="px-4 py-3 font-medium">Space</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Feedback</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {new Date(v.scheduled_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {v.leads ? (
                      <Link href={`/leads/${v.leads.id}`} className="text-indigo-600 hover:underline">
                        {v.leads.brand_name || v.leads.company || v.leads.full_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {v.spaces ? `${v.spaces.code} · ${v.spaces.name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[v.status] ?? STATUS_STYLES.cancelled}`}
                    >
                      {v.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-slate-500">
                    {v.feedback ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {v.status === "scheduled" ? <ViewingActions viewingId={v.id} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
