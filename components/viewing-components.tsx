"use client";

import { useRef, useState, useTransition } from "react";
import { scheduleViewing, updateViewingStatus } from "@/app/leasing-actions";
import { useToast } from "@/components/toast";
import type { Lead, Space } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function ScheduleViewingButton({
  leads,
  spaces,
  defaultLeadId,
}: {
  leads: Pick<Lead, "id" | "full_name" | "brand_name" | "company">[];
  spaces: Pick<Space, "id" | "code" | "name" | "status">[];
  defaultLeadId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await scheduleViewing(formData);
      if (result.ok) {
        toast("Viewing scheduled", "success");
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
        + Schedule Viewing
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Schedule Viewing</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form ref={formRef} action={submit} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Enquiry <span className="text-rose-500">*</span>
                </span>
                <select
                  name="lead_id"
                  required
                  defaultValue={defaultLeadId ?? ""}
                  className={`${inputCls} bg-white`}
                >
                  <option value="" disabled>
                    Select enquiry…
                  </option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {(l.brand_name || l.company || l.full_name) ?? "—"} — {l.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
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
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Date &amp; time <span className="text-rose-500">*</span>
                </span>
                <input name="scheduled_at" type="datetime-local" required className={inputCls} />
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
                  {pending ? "Saving…" : "Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ViewingActions({ viewingId }: { viewingId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function act(status: string) {
    let feedback: string | undefined;
    if (status === "completed") {
      feedback = window.prompt("Viewing feedback (optional):") ?? undefined;
    }
    startTransition(async () => {
      const result = await updateViewingStatus(viewingId, status, feedback);
      if (result.ok) toast(`Viewing ${status.replace("_", " ")}`, "success");
      else toast(result.error ?? "Couldn't save. Please try again.");
    });
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => act("completed")}
        disabled={pending}
        className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
      >
        ✓ Done
      </button>
      <button
        onClick={() => act("no_show")}
        disabled={pending}
        className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
      >
        No-show
      </button>
      <button
        onClick={() => act("cancelled")}
        disabled={pending}
        className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
