"use client";

import { useState, useTransition } from "react";
import {
  approveAgentTask,
  createEmailDraft,
  createWeeklySummary,
  queueOverdueReminders,
  rejectAgentTask,
} from "@/app/agent-actions";
import { useToast } from "@/components/toast";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function DraftEmailButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function draft() {
    startTransition(async () => {
      const result = await createEmailDraft(leadId);
      if (result.ok) {
        setTaskId(result.id ?? null);
        setSubject(result.subject ?? "");
        setBody(result.body ?? "");
        setEmail(result.email ?? null);
        setOpen(true);
      } else {
        toast(result.error ?? "Couldn't draft. Please try again.");
      }
    });
  }

  function send() {
    if (!taskId) return;
    startTransition(async () => {
      const result = await approveAgentTask(taskId, { subject, body });
      if (result.ok) {
        toast("Approved & recorded as sent ✉️", "success");
        setOpen(false);
        if (email) {
          window.open(
            `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            "_blank",
          );
        }
      } else {
        toast(result.error ?? "Couldn't send. Please try again.");
      }
    });
  }

  function reject() {
    if (!taskId) return;
    startTransition(async () => {
      const result = await rejectAgentTask(taskId);
      if (result.ok) {
        toast("Draft rejected", "success");
        setOpen(false);
      } else {
        toast(result.error ?? "Couldn't reject. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        onClick={draft}
        disabled={pending}
        className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
      >
        {pending && !open ? "Drafting…" : "🤖 Draft follow-up email"}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Review draft before sending</h2>
            <p className="mt-1 text-xs text-slate-500">
              Nothing is sent without your approval. Edit freely — approving
              records the send in the audit log
              {email ? ` and opens your mail client addressed to ${email}` : ""}.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Body</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className={inputCls}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={reject}
                disabled={pending}
                className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={send}
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? "Sending…" : "✓ Approve & send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AgentTriggers() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) toast(okMsg, "success");
      else toast(result.error ?? "Nothing to do.");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => run(queueOverdueReminders, "Reminders queued for approval")}
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        ⏰ Queue overdue reminders
      </button>
      <button
        onClick={() => run(createWeeklySummary, "Weekly summary drafted for approval")}
        disabled={pending}
        className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
      >
        📊 Draft weekly summary
      </button>
    </div>
  );
}

export function TaskApprovalActions({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function act(approve: boolean) {
    startTransition(async () => {
      const result = approve
        ? await approveAgentTask(taskId)
        : await rejectAgentTask(taskId);
      if (result.ok) toast(approve ? "Approved" : "Rejected", "success");
      else toast(result.error ?? "Couldn't update. Please try again.");
    });
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => act(true)}
        disabled={pending}
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        ✓ Approve
      </button>
      <button
        onClick={() => act(false)}
        disabled={pending}
        className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
