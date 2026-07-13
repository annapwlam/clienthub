"use client";

import { useRef, useState, useTransition } from "react";
import { createSpace, updateSpaceStatus } from "@/app/leasing-actions";
import { useToast } from "@/components/toast";
import { SPACE_STATUSES, SPACE_TYPES, SPACE_TYPE_LABELS } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function SpaceStatusSelect({
  spaceId,
  status,
}: {
  spaceId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          const result = await updateSpaceStatus(spaceId, next);
          if (result.ok) toast("Space status updated", "success");
          else toast(result.error ?? "Couldn't save. Please try again.");
        });
      }}
      className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${
        status === "vacant"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : status === "occupied"
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : status === "reserved"
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-300 bg-slate-100 text-slate-500"
      } ${pending ? "opacity-50" : ""}`}
    >
      {SPACE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function AddSpaceButton() {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createSpace(formData);
      if (result.ok) {
        toast("Space added", "success");
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
        + Add Space
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Space</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form ref={formRef} action={submit} className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Code <span className="text-rose-500">*</span>
                </span>
                <input name="code" required placeholder="L2-14" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Name <span className="text-rose-500">*</span>
                </span>
                <input name="name" required placeholder="Retail Unit L2-14" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Type</span>
                <select name="space_type" defaultValue="unit" className={`${inputCls} bg-white`}>
                  {SPACE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {SPACE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Size (sqft)</span>
                <input name="size_sqft" type="number" min="0" placeholder="950" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Floor</span>
                <input name="floor" placeholder="2" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Zone</span>
                <input name="zone" placeholder="South Wing" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Monthly rent (LT)</span>
                <input name="rent_monthly" type="number" min="0" step="100" placeholder="7200" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Daily rate (ST)</span>
                <input name="rate_daily" type="number" min="0" step="10" placeholder="150" className={inputCls} />
              </label>
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Suitable for</span>
                <input name="suitable_for" placeholder="Fashion, lifestyle retail" className={inputCls} />
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
                  {pending ? "Saving…" : "Add space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
