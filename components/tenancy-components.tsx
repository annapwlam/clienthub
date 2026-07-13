"use client";

import { useRef, useState, useTransition } from "react";
import {
  createBooking,
  renewLease,
  updateTenancyStatus,
} from "@/app/leasing-actions";
import { useToast } from "@/components/toast";
import type { Space, Tenancy } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function TenancyActions({
  tenancyId,
  status,
}: {
  tenancyId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function act(next: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      const result = await updateTenancyStatus(tenancyId, next);
      if (result.ok) toast(`Tenancy → ${next.replace("_", " ")}`, "success");
      else toast(result.error ?? "Couldn't save. Please try again.");
    });
  }

  const btn = (label: string, next: string, cls: string, confirmMsg?: string) => (
    <button
      key={next}
      onClick={() => act(next, confirmMsg)}
      disabled={pending}
      className={`rounded-md px-2 py-1 text-xs font-medium ring-1 disabled:opacity-50 ${cls}`}
    >
      {label}
    </button>
  );

  const actions: React.ReactNode[] = [];
  if (status === "pending_signing")
    actions.push(
      btn("Signed → Fit-out", "fitout", "bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100"),
      btn("Signed → Active", "active", "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"),
    );
  if (status === "fitout")
    actions.push(
      btn("Open → Active", "active", "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"),
    );
  if (status === "active")
    actions.push(
      btn("End", "ended", "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100", "End this tenancy? The space returns to vacant."),
      btn("Terminate", "terminated", "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100", "Terminate early? The space returns to vacant."),
    );
  if (actions.length === 0) return <span>—</span>;
  return <div className="flex flex-wrap gap-1.5">{actions}</div>;
}

export function RenewLeaseButton({
  tenancy,
}: {
  tenancy: Pick<Tenancy, "id" | "tenant_name" | "end_date" | "rent_monthly">;
}) {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit(formData: FormData) {
    formData.set("tenancy_id", tenancy.id);
    startTransition(async () => {
      const result = await renewLease(formData);
      if (result.ok) {
        toast("Renewal drafted — pending signing", "success");
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
        className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
      >
        ↻ Renew
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Renew lease</h2>
            <p className="mt-1 text-sm text-slate-500">
              {tenancy.tenant_name} — new term starts the day after the current
              lease ends ({tenancy.end_date}).
            </p>
            <form action={submit} className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  New term (months) <span className="text-rose-500">*</span>
                </span>
                <input
                  name="term_months"
                  type="number"
                  min="1"
                  defaultValue={12}
                  required
                  className={inputCls}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  New monthly rent
                </span>
                <input
                  name="rent_monthly"
                  type="number"
                  min="0"
                  step="100"
                  defaultValue={tenancy.rent_monthly ?? ""}
                  className={inputCls}
                />
              </label>
              {fieldError && (
                <p className="text-sm font-medium text-rose-600">{fieldError}</p>
              )}
              <div className="flex justify-end gap-2">
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
                  {pending ? "Saving…" : "Draft renewal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function AddBookingButton({
  spaces,
}: {
  spaces: Pick<Space, "id" | "code" | "name" | "status" | "rate_daily">[];
}) {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createBooking(formData);
      if (result.ok) {
        toast("Booking confirmed", "success");
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
        + New Booking
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">New Short-term Booking</h2>
                <p className="text-xs text-slate-500">
                  Direct booking for a repeat licensee or confirmed event —
                  double-bookings are blocked automatically.
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
            <form ref={formRef} action={submit} className="grid grid-cols-2 gap-4">
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Tenant / event name <span className="text-rose-500">*</span>
                </span>
                <input name="tenant_name" required placeholder="Sparkle Cosmetics Pop-up" className={inputCls} />
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
                      {s.code} · {s.name}
                      {s.rate_daily ? ` — $${s.rate_daily}/day` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Start <span className="text-rose-500">*</span>
                </span>
                <input name="start_date" type="date" required className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  End <span className="text-rose-500">*</span>
                </span>
                <input name="end_date" type="date" required className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Licence fee</span>
                <input name="fee_total" type="number" min="0" step="100" placeholder="11200" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Deposit</span>
                <input name="deposit" type="number" min="0" step="100" placeholder="2000" className={inputCls} />
              </label>
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Notes</span>
                <textarea name="notes" rows={2} placeholder="Setup requirements, power, insurance…" className={inputCls} />
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
                  {pending ? "Saving…" : "Confirm booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
