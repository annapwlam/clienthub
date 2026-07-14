import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AgentTriggers, TaskApprovalActions } from "@/components/agent-components";
import type { AgentTask, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

interface TaskRow extends AgentTask {
  leads: Pick<Lead, "id" | "full_name" | "brand_name" | "company"> | null;
}

const TYPE_LABELS: Record<string, string> = {
  draft_follow_up_email: "✉️ Email draft",
  schedule_reminder: "⏰ Reminder",
  weekly_summary: "📊 Weekly summary",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  sent: "bg-sky-50 text-sky-700 ring-sky-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default async function AgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-3xl">🤖</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">Agent</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to use the assistant — every agent action needs a human
          approval before anything is dispatched.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: tasks, error } = await supabase
    .from("agent_tasks")
    .select("*, leads(id, full_name, brand_name, company)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load agent tasks.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
        <p className="mt-3 text-xs text-rose-500">
          If this says the table doesn&apos;t exist, apply
          supabase/migrations/0007_agentic_layer.sql in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  const rows = (tasks ?? []) as unknown as TaskRow[];
  const pending = rows.filter((t) => t.status === "pending");
  const history = rows.filter((t) => t.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agent</h1>
          <p className="text-sm text-slate-500">
            Named tools only — drafts and reminders queue here and wait for a
            human approval. Email drafts start from each enquiry&apos;s page.
          </p>
        </div>
        <AgentTriggers />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Pending approval{" "}
          {pending.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
            Nothing waiting. Queue reminders or draft a weekly summary above.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((t) => (
              <li key={t.id} className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {TYPE_LABELS[t.task_type] ?? t.task_type} — {t.subject}
                      {t.leads && (
                        <Link
                          href={`/leads/${t.leads.id}`}
                          className="ml-2 text-xs font-medium text-indigo-600 hover:underline"
                        >
                          {t.leads.brand_name || t.leads.company || t.leads.full_name} →
                        </Link>
                      )}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{t.body}</p>
                  </div>
                  <TaskApprovalActions taskId={t.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">History</h2>
        {history.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
            No resolved tasks yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Subject</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Resolved by</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-4">{TYPE_LABELS[t.task_type] ?? t.task_type}</td>
                    <td className="max-w-[280px] truncate py-2.5 pr-4 text-slate-700">{t.subject}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[t.status] ?? STATUS_STYLES.pending}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{t.approved_by ?? "—"}</td>
                    <td className="py-2.5 text-slate-500">
                      {new Date(t.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
