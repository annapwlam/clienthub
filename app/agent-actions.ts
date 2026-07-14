"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions";
import {
  draftFollowUpEmail,
  draftReminder,
  draftWeeklySummary,
} from "@/lib/agent";
import { OPEN_STAGES, type Lead } from "@/lib/types";

const SIGN_IN_ERROR = "Please sign in to make changes.";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function requireUser(supabase: Supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? undefined } : null;
}

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Couldn't complete. Please try again.",
  };
}

async function audit(
  supabase: Supabase,
  userId: string,
  entry: {
    actor: string | null;
    action: string;
    target_id: string;
    payload: Record<string, unknown>;
    risk_level: string;
    approval_status: string;
    approved_by?: string | null;
  },
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    actor: entry.actor ?? "agent",
    action: entry.action,
    target_table: "agent_tasks",
    target_id: entry.target_id,
    payload: entry.payload,
    risk_level: entry.risk_level,
    approval_status: entry.approval_status,
    approved_by: entry.approved_by ?? null,
  });
}

export interface DraftResult extends ActionResult {
  subject?: string;
  body?: string;
  email?: string | null;
}

/** Tool: draft_follow_up_email — creates a pending agent task for approval. */
export async function createEmailDraft(leadId: string): Promise<DraftResult> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    if (!user) return { ok: false, error: SIGN_IN_ERROR };

    const [{ data: lead }, { data: followUps }, { data: offer }] =
      await Promise.all([
        supabase.from("leads").select("*").eq("id", leadId).single(),
        supabase
          .from("follow_ups")
          .select("contacted_at, created_at")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("offers")
          .select("rent_monthly, fee_total, term_months, valid_until, offer_type")
          .eq("lead_id", leadId)
          .in("status", ["sent", "negotiating"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    if (!lead) return { ok: false, error: "Enquiry not found." };

    let spaceCode: string | null = null;
    if (lead.space_id) {
      const { data: space } = await supabase
        .from("spaces")
        .select("code")
        .eq("id", lead.space_id)
        .maybeSingle();
      spaceCode = space?.code ?? null;
    }

    const last = followUps?.[0]?.contacted_at ?? followUps?.[0]?.created_at ?? null;
    const daysSinceContact = last
      ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000)
      : null;

    const draft = await draftFollowUpEmail({
      lead: lead as Lead,
      spaceCode,
      daysSinceContact,
      openOffer: offer,
    });

    const { data: task, error } = await supabase
      .from("agent_tasks")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        task_type: "draft_follow_up_email",
        subject: draft.subject,
        body: draft.body,
        payload: { to: lead.email, space_code: spaceCode },
        risk_level: "medium",
        status: "pending",
      })
      .select("id")
      .single();
    if (error) return fail(error);

    await audit(supabase, user.id, {
      actor: user.email ?? null,
      action: "draft_follow_up_email",
      target_id: task.id,
      payload: { lead_id: leadId },
      risk_level: "medium",
      approval_status: "pending",
    });

    return {
      ok: true,
      id: task.id,
      subject: draft.subject,
      body: draft.body,
      email: lead.email,
    };
  } catch (e) {
    return fail(e);
  }
}

/** Approve a task. For emails this is the human "Send" (high-risk dispatch). */
export async function approveAgentTask(
  taskId: string,
  edits?: { subject?: string; body?: string },
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    if (!user) return { ok: false, error: SIGN_IN_ERROR };

    const { data: task, error: readError } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    if (readError || !task) return fail(readError ?? new Error("Task not found."));
    if (task.status !== "pending")
      return { ok: false, error: "This task was already resolved." };

    const isEmail = task.task_type === "draft_follow_up_email";
    const { error } = await supabase
      .from("agent_tasks")
      .update({
        status: isEmail ? "sent" : "approved",
        approved_by: user.email ?? user.id,
        ...(edits?.subject ? { subject: edits.subject } : {}),
        ...(edits?.body ? { body: edits.body } : {}),
      })
      .eq("id", taskId);
    if (error) return fail(error);

    await audit(supabase, user.id, {
      actor: user.email ?? null,
      action: isEmail ? "send_email" : task.task_type + "_approved",
      target_id: taskId,
      payload: { task_type: task.task_type, lead_id: task.lead_id },
      risk_level: isEmail ? "high" : "medium",
      approval_status: "approved",
      approved_by: user.email ?? user.id,
    });

    if (task.lead_id) {
      await supabase.from("activities").insert({
        user_id: user.id,
        lead_id: task.lead_id,
        action_type: isEmail ? "email_sent" : task.task_type,
        description: isEmail
          ? `Follow-up email approved & sent: ${edits?.subject ?? task.subject}`
          : `Agent task approved: ${task.subject}`,
        performed_by: user.email ?? "agent",
      });
    }

    revalidatePath("/agent");
    revalidatePath("/audit");
    if (task.lead_id) revalidatePath(`/leads/${task.lead_id}`);
    return { ok: true, id: taskId };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectAgentTask(taskId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    if (!user) return { ok: false, error: SIGN_IN_ERROR };

    const { error } = await supabase
      .from("agent_tasks")
      .update({ status: "rejected", approved_by: user.email ?? user.id })
      .eq("id", taskId)
      .eq("status", "pending");
    if (error) return fail(error);

    await audit(supabase, user.id, {
      actor: user.email ?? null,
      action: "agent_task_rejected",
      target_id: taskId,
      payload: {},
      risk_level: "low",
      approval_status: "rejected",
      approved_by: user.email ?? user.id,
    });
    revalidatePath("/agent");
    revalidatePath("/audit");
    return { ok: true, id: taskId };
  } catch (e) {
    return fail(e);
  }
}

/** Tool: schedule_reminder — queue reminders for every overdue enquiry. */
export async function queueOverdueReminders(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    if (!user) return { ok: false, error: SIGN_IN_ERROR };

    const today = new Date().toISOString().slice(0, 10);
    const [{ data: leads }, { data: pending }] = await Promise.all([
      supabase
        .from("leads")
        .select("*, spaces(code)")
        .in("stage", OPEN_STAGES)
        .not("next_action_date", "is", null)
        .lt("next_action_date", today),
      supabase
        .from("agent_tasks")
        .select("lead_id")
        .eq("task_type", "schedule_reminder")
        .eq("status", "pending"),
    ]);

    const alreadyQueued = new Set((pending ?? []).map((t) => t.lead_id));
    const overdue = ((leads ?? []) as (Lead & { spaces: { code: string } | null })[]).filter(
      (l) => !alreadyQueued.has(l.id),
    );
    if (overdue.length === 0)
      return { ok: false, error: "No overdue enquiries without a queued reminder." };

    const rows = overdue.map((l) => {
      const draft = draftReminder(l, l.spaces?.code);
      return {
        user_id: user.id,
        lead_id: l.id,
        task_type: "schedule_reminder",
        subject: draft.subject,
        body: draft.body,
        risk_level: "medium",
        status: "pending",
      };
    });
    const { error } = await supabase.from("agent_tasks").insert(rows);
    if (error) return fail(error);

    await audit(supabase, user.id, {
      actor: user.email ?? null,
      action: "schedule_reminder",
      target_id: user.id,
      payload: { queued: rows.length },
      risk_level: "medium",
      approval_status: "pending",
    });
    revalidatePath("/agent");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Tool: weekly_summary — draft a manager digest from live numbers. */
export async function createWeeklySummary(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    if (!user) return { ok: false, error: SIGN_IN_ERROR };

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const [leadsRes, viewingsRes, offersRes, spacesRes, invoicesRes] =
      await Promise.all([
        supabase.from("leads").select("stage, created_at, next_action_date"),
        supabase
          .from("viewings")
          .select("id")
          .eq("status", "completed")
          .gte("created_at", weekAgo),
        supabase.from("offers").select("id").gte("created_at", weekAgo),
        supabase.from("spaces").select("status"),
        supabase.from("rent_invoices").select("amount, status"),
      ]);

    const leads = leadsRes.data ?? [];
    const spaces = spacesRes.data ?? [];
    const leasable = spaces.filter((s) => s.status !== "maintenance");
    const stats = {
      newEnquiries: leads.filter((l) => l.created_at >= weekAgo).length,
      viewingsHeld: viewingsRes.data?.length ?? 0,
      offersSent: offersRes.data?.length ?? 0,
      signed: leads.filter((l) => l.stage === "won").length,
      lost: leads.filter((l) => l.stage === "lost").length,
      occupancyPct:
        leasable.length === 0
          ? 0
          : Math.round(
              (leasable.filter((s) => s.status === "occupied").length /
                leasable.length) *
                100,
            ),
      outstandingRent: (invoicesRes.data ?? [])
        .filter((i) => i.status === "due")
        .reduce((sum, i) => sum + (i.amount ?? 0), 0),
      overdueFollowUps: leads.filter(
        (l) =>
          !["won", "lost"].includes(l.stage) &&
          l.next_action_date != null &&
          l.next_action_date < today,
      ).length,
    };

    const draft = draftWeeklySummary(stats);
    const { data: task, error } = await supabase
      .from("agent_tasks")
      .insert({
        user_id: user.id,
        task_type: "weekly_summary",
        subject: draft.subject,
        body: draft.body,
        payload: stats,
        risk_level: "medium",
        status: "pending",
      })
      .select("id")
      .single();
    if (error) return fail(error);

    await audit(supabase, user.id, {
      actor: user.email ?? null,
      action: "weekly_summary_drafted",
      target_id: task.id,
      payload: stats,
      risk_level: "medium",
      approval_status: "pending",
    });
    revalidatePath("/agent");
    return { ok: true, id: task.id };
  } catch (e) {
    return fail(e);
  }
}
