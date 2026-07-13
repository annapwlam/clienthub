"use client";

import { useState, useTransition } from "react";
import { addFollowUp, markLost, markWon, updateLead } from "@/app/actions";
import { useToast } from "@/components/toast";
import {
  OUTCOMES,
  OUTCOME_LABELS,
  STAGES,
  STAGE_LABELS,
  type Lead,
} from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function EditLeadInline({ lead }: { lead: Lead }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        ✏️ Edit lead
      </button>
    );
  }

  function submit(formData: FormData) {
    const rawValue = String(formData.get("deal_value") ?? "").trim();
    startTransition(async () => {
      const result = await updateLead(lead.id, {
        stage: String(formData.get("stage")),
        owner_name: String(formData.get("owner_name") ?? "").trim() || null,
        deal_value: rawValue ? Number(rawValue) : null,
        next_action_date:
          String(formData.get("next_action_date") ?? "").trim() || null,
      });
      if (result.ok) {
        toast("Lead updated", "success");
        setEditing(false);
      } else {
        toast(result.error ?? "Couldn't save. Please try again.");
      }
    });
  }

  return (
    <form
      action={submit}
      className="grid w-full grid-cols-2 gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 sm:grid-cols-4"
    >
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-600">Stage</span>
        <select name="stage" defaultValue={lead.stage} className={`${inputCls} bg-white`}>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-600">Owner</span>
        <input name="owner_name" defaultValue={lead.owner_name ?? ""} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-600">Deal value</span>
        <input
          name="deal_value"
          type="number"
          min="0"
          step="100"
          defaultValue={lead.deal_value ?? ""}
          className={inputCls}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-600">Next action</span>
        <input
          name="next_action_date"
          type="date"
          defaultValue={lead.next_action_date ?? ""}
          className={inputCls}
        />
      </label>
      <div className="col-span-2 flex gap-2 sm:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function FollowUpForm({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const [noteError, setNoteError] = useState<string | null>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    if (!String(formData.get("note") ?? "").trim()) {
      setNoteError("Note is required");
      return;
    }
    setNoteError(null);
    formData.set("lead_id", leadId);
    startTransition(async () => {
      const result = await addFollowUp(formData);
      if (result.ok) {
        toast("Follow-up logged", "success");
        (document.getElementById("follow-up-form") as HTMLFormElement)?.reset();
      } else {
        toast(result.error ?? "Couldn't save. Please try again.");
      }
    });
  }

  return (
    <form id="follow-up-form" action={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">
          Note <span className="text-rose-500">*</span>
        </span>
        <textarea
          name="note"
          rows={3}
          placeholder="Intro call done, interested…"
          className={inputCls}
        />
        {noteError && (
          <p className="mt-1 text-xs font-medium text-rose-600">{noteError}</p>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Outcome</span>
          <select name="outcome" defaultValue="pending" className={`${inputCls} bg-white`}>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Next action date</span>
          <input name="next_action_date" type="date" className={inputCls} />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add follow-up"}
      </button>
    </form>
  );
}

export function WonLostButtons({ lead }: { lead: Lead }) {
  const [lostOpen, setLostOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const closed = lead.stage === "won" || lead.stage === "lost";

  function onWon() {
    startTransition(async () => {
      const result = await markWon(lead.id);
      if (result.ok) toast("Marked Won — deal created 🎉", "success");
      else toast(result.error ?? "Couldn't save. Please try again.");
    });
  }

  function onLost() {
    if (!reason.trim()) {
      setReasonError("Lost reason is required");
      return;
    }
    startTransition(async () => {
      const result = await markLost(lead.id, reason);
      if (result.ok) {
        toast("Marked Lost", "success");
        setLostOpen(false);
        setReason("");
        setReasonError(null);
      } else {
        toast(result.error ?? "Couldn't save. Please try again.");
      }
    });
  }

  if (closed) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={onWon}
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        ✓ Mark Won
      </button>
      <button
        onClick={() => setLostOpen(true)}
        disabled={pending}
        className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
      >
        ✕ Mark Lost
      </button>
      {lostOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setLostOpen(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Mark lead as Lost</h2>
            <p className="mt-1 text-sm text-slate-500">
              Capture why this lead didn&apos;t convert — it feeds win-rate reporting.
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Lost reason <span className="text-rose-500">*</span>
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Budget cut"
                className={inputCls}
                autoFocus
              />
              {reasonError && (
                <p className="mt-1 text-xs font-medium text-rose-600">{reasonError}</p>
              )}
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setLostOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={onLost}
                disabled={pending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Mark Lost"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
