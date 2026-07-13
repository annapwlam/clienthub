"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeScore } from "@/lib/scoring";
import { STAGES, type Stage } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const DEMO_TEAM_ID = "a1000000-0000-0000-0000-000000000001";

function fail(error: unknown): ActionResult {
  const message =
    error instanceof Error ? error.message : "Couldn't save. Please try again.";
  return { ok: false, error: message };
}

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: {
    lead_id?: string;
    deal_id?: string;
    action_type: string;
    description: string;
    performed_by?: string | null;
  },
) {
  await supabase.from("activities").insert({
    lead_id: entry.lead_id ?? null,
    deal_id: entry.deal_id ?? null,
    action_type: entry.action_type,
    description: entry.description,
    performed_by: entry.performed_by ?? "system",
  });
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: {
    actor: string | null;
    action: string;
    target_table: string;
    target_id: string;
    payload: Record<string, unknown>;
    risk_level?: string;
  },
) {
  await supabase.from("audit_logs").insert({
    actor: entry.actor ?? "anonymous",
    action: entry.action,
    target_table: entry.target_table,
    target_id: entry.target_id,
    payload: entry.payload,
    risk_level: entry.risk_level ?? "low",
    approval_status: "auto",
  });
}

/** Recompute the rule-engine score for a lead and persist it. */
async function rescoreLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
) {
  const { data: lead } = await supabase
    .from("leads")
    .select("id, stage, deal_value, source, created_at")
    .eq("id", leadId)
    .single();
  if (!lead) return;

  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("contacted_at, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const lastContactAt =
    followUps?.[0]?.contacted_at ?? followUps?.[0]?.created_at ?? null;

  const result = computeScore({
    stage: lead.stage,
    deal_value: lead.deal_value,
    source: lead.source,
    followUpCount: followUps?.length ?? 0,
    lastContactAt,
    createdAt: lead.created_at,
  });

  await supabase.from("leads").update(result).eq("id", leadId);
}

export async function createLead(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const full_name = String(formData.get("full_name") ?? "").trim();
    if (!full_name) return { ok: false, error: "Contact name is required." };

    const stage = String(formData.get("stage") ?? "new");
    if (!STAGES.includes(stage as Stage))
      return { ok: false, error: "Invalid stage." };

    const rawValue = String(formData.get("deal_value") ?? "").trim();
    const deal_value = rawValue ? Number(rawValue) : 0;
    if (Number.isNaN(deal_value) || deal_value < 0)
      return { ok: false, error: "Deal value must be a positive number." };

    const nextAction = String(formData.get("next_action_date") ?? "").trim();

    const { data, error } = await supabase
      .from("leads")
      .insert({
        team_id: DEMO_TEAM_ID,
        full_name,
        company: String(formData.get("company") ?? "").trim() || null,
        email: String(formData.get("email") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        source: String(formData.get("source") ?? "").trim() || null,
        stage,
        owner_name: String(formData.get("owner_name") ?? "").trim() || null,
        deal_value,
        next_action_date: nextAction || null,
      })
      .select("id, owner_name, company")
      .single();
    if (error) return fail(error);

    await logActivity(supabase, {
      lead_id: data.id,
      action_type: "lead_created",
      description: `Lead created${data.company ? ` for ${data.company}` : ""}`,
      performed_by: data.owner_name,
    });
    await logAudit(supabase, {
      actor: data.owner_name,
      action: "lead_created",
      target_table: "leads",
      target_id: data.id,
      payload: { full_name, stage, deal_value },
    });
    await rescoreLead(supabase, data.id);

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateLead(
  leadId: string,
  fields: {
    stage?: string;
    owner_name?: string | null;
    deal_value?: number | null;
    next_action_date?: string | null;
  },
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: before, error: readError } = await supabase
      .from("leads")
      .select("id, stage, owner_name")
      .eq("id", leadId)
      .single();
    if (readError || !before) return fail(readError ?? new Error("Lead not found."));

    if (fields.stage && !STAGES.includes(fields.stage as Stage))
      return { ok: false, error: "Invalid stage." };
    if (
      fields.deal_value != null &&
      (Number.isNaN(fields.deal_value) || fields.deal_value < 0)
    )
      return { ok: false, error: "Deal value must be a positive number." };

    const update: Record<string, unknown> = {};
    for (const key of ["stage", "owner_name", "deal_value", "next_action_date"] as const) {
      if (key in fields) update[key] = fields[key];
    }
    if (Object.keys(update).length === 0) return { ok: true, id: leadId };

    const { error } = await supabase.from("leads").update(update).eq("id", leadId);
    if (error) return fail(error);

    if (fields.stage && fields.stage !== before.stage) {
      await logActivity(supabase, {
        lead_id: leadId,
        action_type: "stage_change",
        description: `Stage moved to ${fields.stage.charAt(0).toUpperCase() + fields.stage.slice(1)}`,
        performed_by: fields.owner_name ?? before.owner_name,
      });
    }
    await logAudit(supabase, {
      actor: fields.owner_name ?? before.owner_name,
      action: "lead_updated",
      target_table: "leads",
      target_id: leadId,
      payload: update,
    });
    await rescoreLead(supabase, leadId);

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/dashboard");
    return { ok: true, id: leadId };
  } catch (e) {
    return fail(e);
  }
}

export async function addFollowUp(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const leadId = String(formData.get("lead_id") ?? "");
    const note = String(formData.get("note") ?? "").trim();
    if (!note) return { ok: false, error: "Note is required." };
    const outcome = String(formData.get("outcome") ?? "pending");
    const nextAction = String(formData.get("next_action_date") ?? "").trim();

    const { data: lead } = await supabase
      .from("leads")
      .select("id, owner_name")
      .eq("id", leadId)
      .single();
    if (!lead) return { ok: false, error: "Lead not found." };

    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        lead_id: leadId,
        note,
        outcome,
        next_action_date: nextAction || null,
        contacted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) return fail(error);

    if (nextAction) {
      await supabase
        .from("leads")
        .update({ next_action_date: nextAction })
        .eq("id", leadId);
    }

    await logActivity(supabase, {
      lead_id: leadId,
      action_type: "follow_up_logged",
      description: `Follow-up logged (${outcome}): ${note.slice(0, 80)}`,
      performed_by: lead.owner_name,
    });
    await logAudit(supabase, {
      actor: lead.owner_name,
      action: "follow_up_logged",
      target_table: "follow_ups",
      target_id: data.id,
      payload: { lead_id: leadId, outcome },
    });
    await rescoreLead(supabase, leadId);

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function markWon(leadId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: lead, error: readError } = await supabase
      .from("leads")
      .select("id, full_name, company, team_id, deal_value, currency, owner_name, stage")
      .eq("id", leadId)
      .single();
    if (readError || !lead) return fail(readError ?? new Error("Lead not found."));
    if (lead.stage === "won") return { ok: false, error: "Lead is already won." };

    const { error: updateError } = await supabase
      .from("leads")
      .update({ stage: "won", lost_reason: null })
      .eq("id", leadId);
    if (updateError) return fail(updateError);

    const title = `${lead.company ?? lead.full_name} — New Engagement`;
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        lead_id: leadId,
        team_id: lead.team_id,
        title,
        value: lead.deal_value ?? 0,
        currency: lead.currency ?? "USD",
        status: "active",
        closed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (dealError) return fail(dealError);

    await logActivity(supabase, {
      lead_id: leadId,
      deal_id: deal.id,
      action_type: "lead_won",
      description: `Lead marked as Won. Deal created: ${title}`,
      performed_by: lead.owner_name,
    });
    await logAudit(supabase, {
      actor: lead.owner_name,
      action: "lead_won",
      target_table: "deals",
      target_id: deal.id,
      payload: { lead_id: leadId, value: lead.deal_value },
      risk_level: "medium",
    });
    await rescoreLead(supabase, leadId);

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/dashboard");
    return { ok: true, id: deal.id };
  } catch (e) {
    return fail(e);
  }
}

export async function markLost(
  leadId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const trimmed = reason.trim();
    if (!trimmed) return { ok: false, error: "Lost reason is required." };

    const supabase = await createClient();
    const { data: lead, error: readError } = await supabase
      .from("leads")
      .select("id, owner_name, stage")
      .eq("id", leadId)
      .single();
    if (readError || !lead) return fail(readError ?? new Error("Lead not found."));
    if (lead.stage === "lost") return { ok: false, error: "Lead is already lost." };

    const { error } = await supabase
      .from("leads")
      .update({ stage: "lost", lost_reason: trimmed })
      .eq("id", leadId);
    if (error) return fail(error);

    await logActivity(supabase, {
      lead_id: leadId,
      action_type: "lead_lost",
      description: `Lead marked as Lost. Reason: ${trimmed}`,
      performed_by: lead.owner_name,
    });
    await logAudit(supabase, {
      actor: lead.owner_name,
      action: "lead_lost",
      target_table: "leads",
      target_id: leadId,
      payload: { reason: trimmed },
      risk_level: "medium",
    });
    await rescoreLead(supabase, leadId);

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/dashboard");
    return { ok: true, id: leadId };
  } catch (e) {
    return fail(e);
  }
}
