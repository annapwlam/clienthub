"use client";

import { useRef, useState, useTransition } from "react";
import { createLead } from "@/app/actions";
import { useToast } from "@/components/toast";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  ENQUIRY_TYPES,
  ENQUIRY_TYPE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  SPACE_TYPE_LABELS,
  STAGE_LABELS,
  type Space,
  type Stage,
} from "@/lib/types";

const FORM_STAGES: Stage[] = ["new", "qualified", "viewing"];

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function AddLeadButton({ spaces = [] }: { spaces?: Space[] }) {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [enquiryType, setEnquiryType] = useState<string>("long_term");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  const shortTerm = enquiryType === "short_term";

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createLead(formData);
      if (result.ok) {
        toast("Enquiry created", "success");
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
        + New Enquiry
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">New Enquiry</h2>
                <p className="text-xs text-slate-500">
                  Capture the first approach — who they are and what space they need.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form ref={formRef} action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Interest
                </legend>
                <div className="flex gap-2">
                  {ENQUIRY_TYPES.map((t) => (
                    <label
                      key={t}
                      className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                        enquiryType === t
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="enquiry_type"
                        value={t}
                        checked={enquiryType === t}
                        onChange={() => setEnquiryType(t)}
                        className="sr-only"
                      />
                      {ENQUIRY_TYPE_LABELS[t]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Contact name <span className="text-rose-500">*</span>
                </span>
                <input name="full_name" required placeholder="Jane Doe" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Brand / trading name</span>
                <input name="brand_name" placeholder="Acme Coffee" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Company (legal entity)</span>
                <input name="company" placeholder="Acme Corp Pte Ltd" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Business type</span>
                <select name="business_type" defaultValue="fnb" className={`${inputCls} bg-white`}>
                  {BUSINESS_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {BUSINESS_TYPE_LABELS[b]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Email</span>
                <input name="email" type="email" placeholder="jane@acme.com" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Phone</span>
                <input name="phone" placeholder="+1-555-0100" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">How did they reach us?</span>
                <select name="source" defaultValue="website" className={`${inputCls} bg-white`}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Handled by</span>
                <input name="owner_name" placeholder="Leasing exec name" className={inputCls} />
              </label>

              <fieldset className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:col-span-2 sm:grid-cols-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Space requirement
                </legend>
                <label className="col-span-2 block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Interested space</span>
                  <select name="space_id" defaultValue="" className={`${inputCls} bg-white`}>
                    <option value="">Not sure yet</option>
                    {spaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} · {SPACE_TYPE_LABELS[s.space_type] ?? s.space_type} · {s.status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Size (sqft)</span>
                  <input name="preferred_size_sqft" type="number" min="0" placeholder="800" className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">
                    {shortTerm ? "Budget (total)" : "Budget (monthly)"}
                  </span>
                  <input name="budget" type="number" min="0" step="100" placeholder={shortTerm ? "8000" : "7000"} className={inputCls} />
                </label>
                <label className="col-span-2 block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Target start date</span>
                  <input name="target_start_date" type="date" className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Duration</span>
                  <input name="duration_value" type="number" min="1" placeholder={shortTerm ? "14" : "3"} className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Unit</span>
                  <select name="duration_unit" defaultValue={shortTerm ? "days" : "years"} key={enquiryType} className={`${inputCls} bg-white`}>
                    <option value="days">days</option>
                    <option value="months">months</option>
                    <option value="years">years</option>
                  </select>
                </label>
              </fieldset>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Stage</span>
                <select name="stage" defaultValue="new" className={`${inputCls} bg-white`}>
                  {FORM_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Est. deal value (USD)
                </span>
                <input name="deal_value" type="number" min="0" step="100" placeholder="30000" className={inputCls} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Next action date</span>
                <input name="next_action_date" type="date" className={inputCls} />
              </label>

              {fieldError && (
                <p className="text-sm font-medium text-rose-600 sm:col-span-2">{fieldError}</p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
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
                  {pending ? "Saving…" : "Create enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
