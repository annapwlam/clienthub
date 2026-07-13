import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateOfferButton, OfferActions } from "@/components/offer-components";
import {
  formatDate,
  formatMoney,
  type Lead,
  type Offer,
  type Space,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface OfferRow extends Offer {
  leads: Pick<Lead, "id" | "full_name" | "brand_name" | "company"> | null;
  spaces: Pick<Space, "id" | "code" | "name"> | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  sent: "bg-sky-50 text-sky-700 ring-sky-200",
  negotiating: "bg-amber-50 text-amber-700 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  expired: "bg-slate-100 text-slate-400 ring-slate-200",
};

export default async function OffersPage() {
  const supabase = await createClient();
  const [{ data: offers, error }, { data: leads }, { data: spaces }] =
    await Promise.all([
      supabase
        .from("offers")
        .select("*, leads(id, full_name, brand_name, company), spaces(id, code, name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, full_name, brand_name, company, enquiry_type, space_id")
        .not("stage", "in", "(won,lost)")
        .order("created_at", { ascending: false }),
      supabase
        .from("spaces")
        .select("id, code, name, status, rent_monthly, rate_daily")
        .order("code"),
    ]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-700">Couldn&apos;t load offers.</p>
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      </div>
    );
  }

  const rows = (offers ?? []) as OfferRow[];
  const open = rows.filter((o) => ["sent", "negotiating"].includes(o.status));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Offers</h1>
          <p className="text-sm text-slate-500">
            {open.length} open offer{open.length === 1 ? "" : "s"} · accepting an
            offer signs the enquiry and creates the tenancy
          </p>
        </div>
        <CreateOfferButton
          leads={(leads ?? []) as Parameters<typeof CreateOfferButton>[0]["leads"]}
          spaces={(spaces ?? []) as Parameters<typeof CreateOfferButton>[0]["spaces"]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-3xl">📝</p>
          <h2 className="mt-2 font-semibold text-slate-900">No offers yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Send a quotation to an enquiry — rent, deposit, term, and incentives.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Enquiry</th>
                <th className="px-4 py-3 font-medium">Space</th>
                <th className="px-4 py-3 font-medium">Terms</th>
                <th className="px-4 py-3 font-medium">Deposit</th>
                <th className="px-4 py-3 font-medium">Valid until</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {o.leads ? (
                      <Link href={`/leads/${o.leads.id}`} className="font-medium text-indigo-600 hover:underline">
                        {o.leads.brand_name || o.leads.company || o.leads.full_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {o.spaces ? o.spaces.code : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {o.offer_type === "long_term" ? (
                      <span>
                        <span className="font-semibold">{formatMoney(o.rent_monthly)}/mo</span>
                        <span className="text-slate-500">
                          {" "}
                          · {o.term_months ?? "—"} mo
                          {o.rent_free_weeks ? ` · ${o.rent_free_weeks}wk rent-free` : ""}
                        </span>
                      </span>
                    ) : (
                      <span>
                        <span className="font-semibold">{formatMoney(o.fee_total)}</span>
                        <span className="text-slate-500">
                          {" "}
                          · {formatDate(o.start_date)} → {formatDate(o.end_date)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatMoney(o.deposit)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(o.valid_until)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[o.status] ?? STATUS_STYLES.draft}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <OfferActions offerId={o.id} status={o.status} />
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
