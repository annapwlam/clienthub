"use client";

import { useState, useTransition } from "react";
import { generateInvoices, updateInvoiceStatus } from "@/app/leasing-actions";
import { useToast } from "@/components/toast";

export function GenerateScheduleForm({
  tenancies,
}: {
  tenancies: { id: string; label: string }[];
}) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function run() {
    if (!selected) {
      toast("Pick a tenancy first.");
      return;
    }
    startTransition(async () => {
      const result = await generateInvoices(selected);
      if (result.ok) toast("Invoice schedule generated", "success");
      else toast(result.error ?? "Couldn't generate. Please try again.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">Generate schedule for…</option>
        {tenancies.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate invoices"}
      </button>
    </div>
  );
}

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function act(next: "paid" | "void" | "due") {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, next);
      if (result.ok)
        toast(next === "paid" ? "Marked paid 💰" : `Invoice ${next}`, "success");
      else toast(result.error ?? "Couldn't save. Please try again.");
    });
  }

  if (status === "void") return <span>—</span>;
  if (status === "paid")
    return (
      <button
        onClick={() => act("due")}
        disabled={pending}
        className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
      >
        Undo paid
      </button>
    );
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => act("paid")}
        disabled={pending}
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        ✓ Mark paid
      </button>
      <button
        onClick={() => act("void")}
        disabled={pending}
        className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
      >
        Void
      </button>
    </div>
  );
}
