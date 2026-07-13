import { createClient } from "@/lib/supabase/server";
import {
  GenerateScheduleForm,
  InvoiceActions,
} from "@/components/billing-components";
import {
  formatDate,
  formatMoney,
  type RentInvoice,
  type Space,
  type Tenancy,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface InvoiceRow extends RentInvoice {
  tenancies: Pick<Tenancy, "id" | "tenant_name" | "tenancy_type"> | null;
  spaces: Pick<Space, "id" | "code"> | null;
}

export default async function BillingPage() {
  const supabase = await createClient();
  const [{ data: invoices, error }, { data: tenancies }] = await Promise.all([
    supabase
      .from("rent_invoices")
      .select("*, tenancies(id, tenant_name, tenancy_type), spaces(id, code)")
      .order("due_date", { ascending: true }),
    supabase
      .from("tenancies")
      .select("id, tenant_name, tenancy_type, start_date, end_date, status, spaces(code)")
      .in("status", ["pending_signing", "fitout", "active"])
      .order("start_date"),
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load billing.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
        <p className="mt-3 text-xs text-rose-500">
          If this says the table doesn&apos;t exist, apply
          supabase/migrations/0003_rent_invoices.sql in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  const rows = (invoices ?? []) as InvoiceRow[];
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (i: InvoiceRow) => i.status === "due" && i.due_date < today;

  const outstanding = rows
    .filter((i) => i.status === "due")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const overdueCount = rows.filter(isOverdue).length;
  const monthStart = today.slice(0, 8) + "01";
  const collectedThisMonth = rows
    .filter((i) => i.status === "paid" && i.paid_at && i.paid_at.slice(0, 10) >= monthStart)
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const tenancyOptions = (
    (tenancies ?? []) as unknown as (Tenancy & { spaces: { code: string } | null })[]
  ).map((t) => ({
    id: t.id,
    label: `${t.tenant_name} · ${t.spaces?.code ?? "—"} · ${t.tenancy_type === "lease" ? "lease" : "licence"} (${t.start_date} → ${t.end_date})`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Billing</h1>
          <p className="text-sm text-slate-500">
            {formatMoney(outstanding)} outstanding
            {overdueCount > 0 && (
              <span className="ml-1 font-semibold text-rose-600">
                · {overdueCount} overdue
              </span>
            )}{" "}
            · {formatMoney(collectedThisMonth)} collected this month
          </p>
        </div>
        <GenerateScheduleForm tenancies={tenancyOptions} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">💰</p>
          <h2 className="mt-2 font-semibold text-slate-900">No invoices yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Pick a tenancy above and generate its rent schedule — monthly
            invoices for leases, a single licence-fee invoice for bookings.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Space</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((i) => {
                const overdue = isOverdue(i);
                const badge = overdue
                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                  : i.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : i.status === "void"
                      ? "bg-slate-100 text-slate-400 ring-slate-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200";
                return (
                  <tr key={i.id} className={`hover:bg-slate-50 ${i.status === "void" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {i.tenancies?.tenant_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{i.spaces?.code ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(i.period_start)} → {formatDate(i.period_end)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(i.due_date)}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(i.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badge}`}>
                        {overdue ? "overdue" : i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceActions invoiceId={i.id} status={i.status} />
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
