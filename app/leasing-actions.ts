"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function fail(error: unknown): ActionResult {
  const message =
    error instanceof Error ? error.message : "Couldn't save. Please try again.";
  return { ok: false, error: message };
}

async function logActivity(
  supabase: Supabase,
  entry: {
    lead_id?: string | null;
    action_type: string;
    description: string;
    performed_by?: string | null;
  },
) {
  await supabase.from("activities").insert({
    lead_id: entry.lead_id ?? null,
    action_type: entry.action_type,
    description: entry.description,
    performed_by: entry.performed_by ?? "system",
  });
}

async function logAudit(
  supabase: Supabase,
  entry: {
    actor?: string | null;
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

function revalidateLeasing() {
  for (const path of [
    "/spaces",
    "/viewings",
    "/offers",
    "/tenancies",
    "/bookings",
    "/leads",
    "/dashboard",
  ])
    revalidatePath(path);
}

// ── Spaces ────────────────────────────────────────────────────────────────────

export async function createSpace(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const code = String(formData.get("code") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!code || !name)
      return { ok: false, error: "Space code and name are required." };

    const num = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v ? Number(v) : null;
    };

    const { data, error } = await supabase
      .from("spaces")
      .insert({
        code,
        name,
        space_type: String(formData.get("space_type") ?? "unit"),
        floor: String(formData.get("floor") ?? "").trim() || null,
        zone: String(formData.get("zone") ?? "").trim() || null,
        size_sqft: num("size_sqft"),
        rent_monthly: num("rent_monthly"),
        rate_daily: num("rate_daily"),
        suitable_for: String(formData.get("suitable_for") ?? "").trim() || null,
        status: "vacant",
      })
      .select("id")
      .single();
    if (error) return fail(error);

    await logAudit(supabase, {
      action: "space_created",
      target_table: "spaces",
      target_id: data.id,
      payload: { code, name },
    });
    revalidateLeasing();
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateSpaceStatus(
  spaceId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("spaces")
      .update({ status })
      .eq("id", spaceId);
    if (error) return fail(error);
    await logAudit(supabase, {
      action: "space_status_changed",
      target_table: "spaces",
      target_id: spaceId,
      payload: { status },
    });
    revalidateLeasing();
    return { ok: true, id: spaceId };
  } catch (e) {
    return fail(e);
  }
}

// ── Viewings ─────────────────────────────────────────────────────────────────

export async function scheduleViewing(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const leadId = String(formData.get("lead_id") ?? "");
    const spaceId = String(formData.get("space_id") ?? "");
    const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
    if (!leadId || !spaceId || !scheduledAt)
      return { ok: false, error: "Enquiry, space, and date/time are required." };

    const { data: lead } = await supabase
      .from("leads")
      .select("id, owner_name, stage, company, full_name")
      .eq("id", leadId)
      .single();
    if (!lead) return { ok: false, error: "Enquiry not found." };

    const { data, error } = await supabase
      .from("viewings")
      .insert({
        lead_id: leadId,
        space_id: spaceId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: "scheduled",
      })
      .select("id")
      .single();
    if (error) return fail(error);

    // A scheduled viewing advances early-funnel enquiries to the Viewing stage.
    if (["new", "qualified"].includes(lead.stage)) {
      await supabase.from("leads").update({ stage: "viewing" }).eq("id", leadId);
      await logActivity(supabase, {
        lead_id: leadId,
        action_type: "stage_change",
        description: "Stage moved to Viewing (site visit scheduled)",
        performed_by: lead.owner_name,
      });
    }
    await logActivity(supabase, {
      lead_id: leadId,
      action_type: "viewing_scheduled",
      description: `Site viewing scheduled`,
      performed_by: lead.owner_name,
    });
    await logAudit(supabase, {
      actor: lead.owner_name,
      action: "viewing_scheduled",
      target_table: "viewings",
      target_id: data.id,
      payload: { lead_id: leadId, space_id: spaceId, scheduled_at: scheduledAt },
    });
    revalidateLeasing();
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateViewingStatus(
  viewingId: string,
  status: string,
  feedback?: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: viewing, error } = await supabase
      .from("viewings")
      .update({ status, ...(feedback ? { feedback } : {}) })
      .eq("id", viewingId)
      .select("id, lead_id")
      .single();
    if (error) return fail(error);

    await logActivity(supabase, {
      lead_id: viewing.lead_id,
      action_type: "viewing_" + status,
      description: `Viewing marked ${status.replace("_", " ")}${feedback ? `: ${feedback.slice(0, 80)}` : ""}`,
    });
    await logAudit(supabase, {
      action: "viewing_status_changed",
      target_table: "viewings",
      target_id: viewingId,
      payload: { status },
    });
    revalidateLeasing();
    return { ok: true, id: viewingId };
  } catch (e) {
    return fail(e);
  }
}

// ── Offers ───────────────────────────────────────────────────────────────────

export async function createOffer(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const leadId = String(formData.get("lead_id") ?? "");
    const spaceId = String(formData.get("space_id") ?? "");
    const offerType = String(formData.get("offer_type") ?? "long_term");
    if (!leadId || !spaceId)
      return { ok: false, error: "Enquiry and space are required." };

    const num = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v ? Number(v) : null;
    };
    const str = (k: string) => String(formData.get(k) ?? "").trim() || null;

    const rentMonthly = num("rent_monthly");
    const feeTotal = num("fee_total");
    if (offerType === "long_term" && !rentMonthly)
      return { ok: false, error: "Monthly rent is required for a long-term offer." };
    if (offerType === "short_term" && !feeTotal)
      return { ok: false, error: "Licence fee is required for a short-term offer." };
    if (offerType === "short_term" && (!str("start_date") || !str("end_date")))
      return { ok: false, error: "Start and end dates are required for short-term use." };

    const { data: lead } = await supabase
      .from("leads")
      .select("id, owner_name, stage")
      .eq("id", leadId)
      .single();
    if (!lead) return { ok: false, error: "Enquiry not found." };

    const { data, error } = await supabase
      .from("offers")
      .insert({
        lead_id: leadId,
        space_id: spaceId,
        offer_type: offerType,
        rent_monthly: rentMonthly,
        fee_total: feeTotal,
        deposit: num("deposit"),
        term_months: num("term_months"),
        start_date: str("start_date"),
        end_date: str("end_date"),
        rent_free_weeks: num("rent_free_weeks") ?? 0,
        valid_until: str("valid_until"),
        status: "sent",
        notes: str("notes"),
      })
      .select("id")
      .single();
    if (error) return fail(error);

    // Sending an offer advances the enquiry to the Offer stage.
    if (["new", "qualified", "viewing"].includes(lead.stage)) {
      await supabase.from("leads").update({ stage: "proposal" }).eq("id", leadId);
      await logActivity(supabase, {
        lead_id: leadId,
        action_type: "stage_change",
        description: "Stage moved to Offer (quotation sent)",
        performed_by: lead.owner_name,
      });
    }
    await logActivity(supabase, {
      lead_id: leadId,
      action_type: "offer_sent",
      description:
        offerType === "long_term"
          ? `Offer sent: $${rentMonthly}/mo, ${num("term_months") ?? "—"} months`
          : `Offer sent: $${feeTotal} licence fee`,
      performed_by: lead.owner_name,
    });
    await logAudit(supabase, {
      actor: lead.owner_name,
      action: "offer_created",
      target_table: "offers",
      target_id: data.id,
      payload: { lead_id: leadId, space_id: spaceId, offer_type: offerType },
      risk_level: "medium",
    });
    revalidateLeasing();
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Offer status transitions. Accepting an offer is the leasing "close":
 * lead → Signed, tenancy row created, space reserved.
 */
export async function updateOfferStatus(
  offerId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: offer, error: readError } = await supabase
      .from("offers")
      .select("*, leads(id, owner_name, stage, company, full_name, brand_name), spaces(id, code, name)")
      .eq("id", offerId)
      .single();
    if (readError || !offer) return fail(readError ?? new Error("Offer not found."));

    if (status !== "accepted") {
      const { error } = await supabase
        .from("offers")
        .update({ status })
        .eq("id", offerId);
      if (error) return fail(error);
      if (offer.lead_id && status === "negotiating") {
        await supabase
          .from("leads")
          .update({ stage: "negotiation" })
          .eq("id", offer.lead_id)
          .in("stage", ["new", "qualified", "viewing", "proposal"]);
        await logActivity(supabase, {
          lead_id: offer.lead_id,
          action_type: "stage_change",
          description: "Stage moved to Negotiation",
        });
      }
      await logAudit(supabase, {
        action: "offer_status_changed",
        target_table: "offers",
        target_id: offerId,
        payload: { status },
      });
      revalidateLeasing();
      return { ok: true, id: offerId };
    }

    // ── Accepted: close the deal ──
    const { error: acceptError } = await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offerId);
    if (acceptError) return fail(acceptError);

    const lead = offer.leads as {
      id: string;
      owner_name: string | null;
      company: string | null;
      full_name: string;
      brand_name: string | null;
    } | null;
    const tenantName =
      lead?.brand_name || lead?.company || lead?.full_name || "New tenant";

    const isLease = offer.offer_type === "long_term";
    const start =
      offer.start_date ?? new Date().toISOString().slice(0, 10);
    let end = offer.end_date;
    if (!end) {
      const d = new Date(start + "T00:00:00");
      d.setMonth(d.getMonth() + (offer.term_months ?? 12));
      end = d.toISOString().slice(0, 10);
    }

    const { data: tenancy, error: tenancyError } = await supabase
      .from("tenancies")
      .insert({
        lead_id: offer.lead_id,
        offer_id: offerId,
        space_id: offer.space_id,
        tenancy_type: isLease ? "lease" : "licence",
        tenant_name: tenantName,
        start_date: start,
        end_date: end,
        rent_monthly: offer.rent_monthly,
        fee_total: offer.fee_total,
        deposit: offer.deposit,
        status: "pending_signing",
      })
      .select("id")
      .single();
    if (tenancyError) return fail(tenancyError);

    if (offer.space_id) {
      await supabase
        .from("spaces")
        .update({ status: "reserved" })
        .eq("id", offer.space_id)
        .eq("status", "vacant");
    }

    if (offer.lead_id) {
      await supabase
        .from("leads")
        .update({ stage: "won", lost_reason: null })
        .eq("id", offer.lead_id);
      // Keep the generic deals record for revenue history.
      await supabase.from("deals").insert({
        lead_id: offer.lead_id,
        title: `${tenantName} — ${isLease ? "Lease" : "Licence"} ${(offer.spaces as { code?: string } | null)?.code ?? ""}`.trim(),
        value: isLease
          ? (offer.rent_monthly ?? 0) * (offer.term_months ?? 12)
          : (offer.fee_total ?? 0),
        status: "active",
        closed_at: new Date().toISOString(),
      });
      await logActivity(supabase, {
        lead_id: offer.lead_id,
        action_type: "lead_won",
        description: `Offer accepted — ${isLease ? "lease" : "licence"} created, pending signing`,
        performed_by: lead?.owner_name,
      });
    }
    await logAudit(supabase, {
      actor: lead?.owner_name,
      action: "offer_accepted",
      target_table: "tenancies",
      target_id: tenancy.id,
      payload: { offer_id: offerId, tenant: tenantName },
      risk_level: "medium",
    });
    revalidateLeasing();
    return { ok: true, id: tenancy.id };
  } catch (e) {
    return fail(e);
  }
}

// ── Tenancies & bookings ─────────────────────────────────────────────────────

/** Direct short-term booking (walk-in / repeat licensee — no offer needed). */
export async function createBooking(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const tenantName = String(formData.get("tenant_name") ?? "").trim();
    const spaceId = String(formData.get("space_id") ?? "");
    const start = String(formData.get("start_date") ?? "").trim();
    const end = String(formData.get("end_date") ?? "").trim();
    if (!tenantName || !spaceId || !start || !end)
      return { ok: false, error: "Tenant, space, and both dates are required." };
    if (end < start)
      return { ok: false, error: "End date must be after the start date." };

    // Overlap guard: no double-booking the same space.
    const { data: clashes, error: clashError } = await supabase
      .from("tenancies")
      .select("id, tenant_name, start_date, end_date")
      .eq("space_id", spaceId)
      .in("status", ["pending_signing", "fitout", "active"])
      .lte("start_date", end)
      .gte("end_date", start);
    if (clashError) return fail(clashError);
    if (clashes && clashes.length > 0)
      return {
        ok: false,
        error: `Space is already booked ${clashes[0].start_date} → ${clashes[0].end_date} (${clashes[0].tenant_name}).`,
      };

    const num = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v ? Number(v) : null;
    };

    const { data, error } = await supabase
      .from("tenancies")
      .insert({
        space_id: spaceId,
        tenancy_type: "licence",
        tenant_name: tenantName,
        start_date: start,
        end_date: end,
        fee_total: num("fee_total"),
        deposit: num("deposit"),
        status: "active",
        notes: String(formData.get("notes") ?? "").trim() || null,
      })
      .select("id")
      .single();
    if (error) return fail(error);

    await supabase
      .from("spaces")
      .update({ status: "reserved" })
      .eq("id", spaceId)
      .eq("status", "vacant");
    await logAudit(supabase, {
      action: "booking_created",
      target_table: "tenancies",
      target_id: data.id,
      payload: { tenant: tenantName, space_id: spaceId, start, end },
      risk_level: "medium",
    });
    revalidateLeasing();
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTenancyStatus(
  tenancyId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: tenancy, error } = await supabase
      .from("tenancies")
      .update({ status })
      .eq("id", tenancyId)
      .select("id, lead_id, space_id, tenant_name")
      .single();
    if (error) return fail(error);

    // Keep the space status in sync with the tenancy lifecycle.
    if (tenancy.space_id) {
      const spaceStatus =
        status === "active"
          ? "occupied"
          : status === "fitout" || status === "pending_signing"
            ? "reserved"
            : "vacant"; // ended / terminated
      await supabase
        .from("spaces")
        .update({ status: spaceStatus })
        .eq("id", tenancy.space_id);
    }

    await logActivity(supabase, {
      lead_id: tenancy.lead_id,
      action_type: "tenancy_" + status,
      description: `Tenancy for ${tenancy.tenant_name} → ${status.replace("_", " ")}`,
    });
    await logAudit(supabase, {
      action: "tenancy_status_changed",
      target_table: "tenancies",
      target_id: tenancyId,
      payload: { status },
      risk_level: "medium",
    });
    revalidateLeasing();
    return { ok: true, id: tenancyId };
  } catch (e) {
    return fail(e);
  }
}
