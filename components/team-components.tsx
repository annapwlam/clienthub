"use client";

import { useRef, useState, useTransition } from "react";
import { inviteMember } from "@/app/leasing-actions";
import { useToast } from "@/components/toast";

export function InviteMemberForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteMember(formData);
      if (result.ok) {
        toast("Invite added — they get access when they sign up", "success");
        formRef.current?.reset();
        setError(null);
      } else {
        setError(result.error ?? null);
        toast(result.error ?? "Couldn't invite. Please try again.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-wrap items-end gap-2">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="teammate@company.com"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Role</span>
        <select
          name="role"
          defaultValue="rep"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="rep">Rep</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Inviting…" : "Invite"}
      </button>
      {error && <p className="w-full text-sm font-medium text-rose-600">{error}</p>}
    </form>
  );
}
