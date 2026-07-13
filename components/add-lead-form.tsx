"use client";

import { useRef, useState, useTransition } from "react";
import { createLead } from "@/app/actions";
import { useToast } from "@/components/toast";
import { SOURCES, SOURCE_LABELS, STAGE_LABELS, type Stage } from "@/lib/types";

const FORM_STAGES: Stage[] = ["new", "qualified", "proposal"];

export function AddLeadButton() {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createLead(formData);
      if (result.ok) {
        toast("Lead created", "success");
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
        + Add Lead
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Lead</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form ref={formRef} action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Contact name <span className="text-rose-500">*</span>
                </span>
                <input
                  name="full_name"
                  required
                  placeholder="Jane Doe"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Company</span>
                <input
                  name="company"
                  placeholder="Acme Corp"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="jane@acme.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Phone</span>
                <input
                  name="phone"
                  placeholder="+1-555-0100"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Source</span>
                <select
                  name="source"
                  defaultValue="referral"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Stage</span>
                <select
                  name="stage"
                  defaultValue="new"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {FORM_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Owner</span>
                <input
                  name="owner_name"
                  placeholder="Your name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Deal value (USD)</span>
                <input
                  name="deal_value"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="30000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Next action date</span>
                <input
                  name="next_action_date"
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
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
                  {pending ? "Saving…" : "Create lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
