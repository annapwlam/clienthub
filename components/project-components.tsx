"use client";

import { useRef, useState, useTransition } from "react";
import { createProject, logTime, updateProject } from "@/app/leasing-actions";
import { useToast } from "@/components/toast";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function AddProjectButton({
  tenancies,
}: {
  tenancies: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createProject(formData);
      if (result.ok) {
        toast("Project created", "success");
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
        + New Project
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">New Project</h2>
            <p className="mt-1 text-xs text-slate-500">
              Track fit-out or operations work against a tenancy.
            </p>
            <form ref={formRef} action={submit} className="mt-4 grid grid-cols-2 gap-4">
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Name <span className="text-rose-500">*</span>
                </span>
                <input name="name" required placeholder="L2-21 Fit-out" className={inputCls} />
              </label>
              <label className="col-span-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Tenancy <span className="text-rose-500">*</span>
                </span>
                <select name="tenancy_id" required defaultValue="" className={`${inputCls} bg-white`}>
                  <option value="" disabled>
                    Select tenancy…
                  </option>
                  {tenancies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Budget (hours)</span>
                <input name="budget_hours" type="number" min="0" placeholder="120" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Budget (cost)</span>
                <input name="budget_cost" type="number" min="0" step="100" placeholder="25000" className={inputCls} />
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
                  {pending ? "Saving…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function LogTimeForm({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    formData.set("project_id", projectId);
    startTransition(async () => {
      const result = await logTime(formData);
      if (result.ok) {
        toast("Time logged", "success");
        formRef.current?.reset();
      } else {
        toast(result.error ?? "Couldn't save. Please try again.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-wrap items-end gap-2">
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">Hours</span>
        <input name="hours" type="number" min="0.5" step="0.5" required placeholder="8" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">Date</span>
        <input name="entry_date" type="date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">What was done</span>
        <input name="description" placeholder="Signage install" className="w-44 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "…" : "Log time"}
      </button>
    </form>
  );
}

export function ProjectOutcomeForm({
  project,
}: {
  project: {
    id: string;
    status: string;
    actual_cost: number | null;
    satisfaction_score: number | null;
    churn_risk: boolean | null;
    upsell_notes: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit(formData: FormData) {
    const satisfaction = String(formData.get("satisfaction_score") ?? "").trim();
    const cost = String(formData.get("actual_cost") ?? "").trim();
    startTransition(async () => {
      const result = await updateProject(project.id, {
        status: String(formData.get("status") ?? project.status),
        actual_cost: cost ? Number(cost) : null,
        satisfaction_score: satisfaction ? Number(satisfaction) : null,
        churn_risk: formData.get("churn_risk") === "on",
        upsell_notes: String(formData.get("upsell_notes") ?? "").trim() || null,
      });
      if (result.ok) toast("Project updated", "success");
      else toast(result.error ?? "Couldn't save. Please try again.");
    });
  }

  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">Status</span>
        <select name="status" defaultValue={project.status} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">Actual cost</span>
        <input name="actual_cost" type="number" min="0" step="100" defaultValue={project.actual_cost ?? ""} className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">Satisfaction</span>
        <select name="satisfaction_score" defaultValue={project.satisfaction_score ?? ""} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 pb-1.5 text-xs font-medium text-slate-600">
        <input name="churn_risk" type="checkbox" defaultChecked={project.churn_risk ?? false} className="rounded border-slate-300" />
        Churn risk
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">Upsell notes</span>
        <input name="upsell_notes" defaultValue={project.upsell_notes ?? ""} placeholder="Second unit interest…" className="w-52 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
    </form>
  );
}
