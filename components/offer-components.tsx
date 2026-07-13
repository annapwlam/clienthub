"use client";

import { useRef, useState, useTransition } from "react";
import { createOffer, updateOfferStatus } from "@/app/leasing-actions";
import { useToast } from "@/components/toast";
import { ENQUIRY_TYPE_LABELS, type Lead, type Space } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

type LeadOption = Pick<
  Lead,
  "id" | "full_name" | "brand_name" | "company" | "enquiry_type" | "space_id"
>;

export function CreateOfferButton({
  leads,
  spaces,
}: {
  leads: LeadOption[];
  spaces: Pick<Space, "id" | "code" | "name" | "status" | "rent_monthly" | "rate_daily">[];
}) {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [offerType, setOfferType] = useState("long_term");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  const shortTerm = offerType === "short_term";

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createOffer(formData);
      if (result.ok) {
        toast("Offer sent", "success");
        formRef.current?.reset();
        setFieldError(null);
        setOpen(false);
      } else {
        setFieldError(result.error ?? null);
        toast(result.error ?? "Couldn't save. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
      >
        + Create Offer
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Offer</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form ref={formRef} action={submit} className="grid grid-cols-2 gap-4">
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Enquiry <span className="text-rose-500">*</span>
                </span>
                <select
                  name="lead_id"
                  required
                  defaultValue=""
                  onChange={(e) => {
                    const lead = leads.find((l) => l.id === e.target.value);
                    if (lead?.enquiry_type) setOfferType(lead.enquiry_type);
                  }}
                  className={`${inputCls} bg-white`}
                >
                  <option value="" disabled>
                    Select enquiry…
                  </option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {(l.brand_name || l.company || l.full_name) ?? "—"} (
                      {ENQUIRY_TYPE_LABELS[l.enquiry_type ?? "long_term"]})
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Space <span className="text-rose-500">*</span>
                </span>
                <select name="space_id" required defaultValue="" className={`${inputCls} bg-white`}>
                  <option value="" disabled>
                    Select space…
                  </option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </label>

              <input type="hidden" name="offer_type" value={offerType} />
              <div className="col-span-2 flex gap-2">
                {(["long_term", "short_term"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOfferType(t)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                      offerType === t
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {ENQUIRY_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              {shortTerm ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      Licence fee (total) <span className="text-rose-500">*</span>
                    </span>
                    <input name="fee_total" type="number" min="0" step="100" placeholder="11200" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Deposit</span>
                    <input name="deposit" type="number" min="0" step="100" placeholder="2000" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      Start date <span className="text-rose-500">*</span>
                    </span>
                    <input name="start_date" type="date" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      End date <span className="text-rose-500">*</span>
                    </span>
                    <input name="end_date" type="date" className={inputCls} />
                  </label>
                </>
              ) : (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      Monthly rent <span className="text-rose-500">*</span>
                    </span>
                    <input name="rent_monthly" type="number" min="0" step="100" placeholder="12000" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Term (months)</span>
                    <input name="term_months" type="number" min="1" placeholder="36" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Deposit</span>
                    <input name="deposit" type="number" min="0" step="100" placeholder="36000" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Rent-free (weeks)</span>
                    <input name="rent_free_weeks" type="number" min="0" placeholder="4" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Lease start</span>
                    <input name="start_date" type="date" className={inputCls} />
                  </label>
                </>
              )}
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Offer valid until</span>
                <input name="valid_until" type="date" className={inputCls} />
              </label>
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Notes</span>
                <textarea name="notes" rows={2} placeholder="Incentives, conditions…" className={inputCls} />
              </label>

              {fieldError && (
                <p className="col-span-2 text-sm font-medium text-rose-600">{fieldError}</p>
              )}
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {pending ? "Sending…" : "Send offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function OfferActions({
  offerId,
  status,
}: {
  offerId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function act(next: string) {
    if (
      next === "accepted" &&
      !window.confirm(
        "Accept this offer? The enquiry is marked Signed, a tenancy is created, and the space is reserved.",
      )
    )
      return;
    startTransition(async () => {
      const result = await updateOfferStatus(offerId, next);
      if (result.ok)
        toast(
          next === "accepted" ? "Offer accepted — tenancy created 🎉" : `Offer ${next}`,
          "success",
        );
      else toast(result.error ?? "Couldn't save. Please try again.");
    });
  }

  if (["accepted", "rejected", "expired"].includes(status)) return <span>—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => act("accepted")}
        disabled={pending}
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        ✓ Accept
      </button>
      {status !== "negotiating" && (
        <button
          onClick={() => act("negotiating")}
          disabled={pending}
          className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
        >
          Negotiate
        </button>
      )}
      <button
        onClick={() => act("rejected")}
        disabled={pending}
        className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
