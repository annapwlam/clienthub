// Agentic layer (Sprint 6) — named tools only, per docs/AGENTIC_LAYER.md.
// Drafts are rule/template-based so the core works with the AI switched off;
// if OPENAI_API_KEY is present the draft is polished by the model instead.

import {
  ENQUIRY_TYPE_LABELS,
  STAGE_LABELS,
  formatMoney,
  type Lead,
  type Offer,
  type Stage,
} from "@/lib/types";

interface DraftContext {
  lead: Lead;
  spaceCode?: string | null;
  daysSinceContact: number | null;
  openOffer?: Pick<
    Offer,
    "rent_monthly" | "fee_total" | "term_months" | "valid_until" | "offer_type"
  > | null;
}

export interface EmailDraft {
  subject: string;
  body: string;
}

function templateFollowUpEmail(ctx: DraftContext): EmailDraft {
  const { lead, spaceCode, daysSinceContact, openOffer } = ctx;
  const firstName = lead.full_name.split(" ")[0];
  const brand = lead.brand_name || lead.company || "your business";
  const space = spaceCode ? `space ${spaceCode}` : "a space with us";
  const interest = ENQUIRY_TYPE_LABELS[lead.enquiry_type ?? "long_term"].toLowerCase();

  const opening =
    daysSinceContact != null && daysSinceContact > 7
      ? `It's been ${daysSinceContact} days since we last spoke, so I wanted to pick our conversation back up.`
      : `Thanks again for your interest in ${space} for ${brand}.`;

  let middle: string;
  switch (lead.stage as Stage) {
    case "new":
    case "qualified":
      middle = `Based on what you shared about ${brand}, I think ${space} could be a strong fit for a ${interest}. Would you be open to a short site visit this week? I can walk you through the unit, footfall patterns, and typical terms.`;
      break;
    case "viewing":
      middle = `Following your site visit, I'd love to hear your thoughts on ${space}. If it felt right, I can put together an offer with terms tailored to ${brand} — including options on the start date and any fit-out support you'd need.`;
      break;
    case "proposal":
    case "negotiation": {
      const terms = openOffer
        ? openOffer.offer_type === "long_term"
          ? `${formatMoney(openOffer.rent_monthly)}/month over ${openOffer.term_months ?? "—"} months`
          : `a licence fee of ${formatMoney(openOffer.fee_total)}`
        : "the terms we discussed";
      const validity = openOffer?.valid_until
        ? ` The offer is held for you until ${openOffer.valid_until}.`
        : "";
      middle = `Just checking in on the offer for ${space} — ${terms}.${validity} If any part of the terms is holding things up, tell me what would work better and I'll see what we can do.`;
      break;
    }
    default:
      middle = `Let me know if there is anything I can help with regarding ${space}.`;
  }

  return {
    subject: `${brand} × ${spaceCode ?? "our mall"} — next steps`,
    body: `Hi ${firstName},\n\n${opening}\n\n${middle}\n\nBest regards,\n${lead.owner_name ?? "The Leasing Team"}`,
  };
}

/** draft_follow_up_email (medium risk): returns a draft for human approval. */
export async function draftFollowUpEmail(ctx: DraftContext): Promise<EmailDraft> {
  const template = templateFollowUpEmail(ctx);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return template;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You polish leasing follow-up emails for a shopping mall. Keep them short, warm, and specific. Return only the email body, no subject.",
          },
          { role: "user", content: template.body },
        ],
        max_tokens: 400,
      }),
    });
    if (!res.ok) return template;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const polished = data.choices?.[0]?.message?.content?.trim();
    return polished ? { subject: template.subject, body: polished } : template;
  } catch {
    return template;
  }
}

/** schedule_reminder (medium risk): reminder text for an overdue enquiry. */
export function draftReminder(lead: Lead, spaceCode?: string | null): EmailDraft {
  const brand = lead.brand_name || lead.company || lead.full_name;
  return {
    subject: `Overdue follow-up: ${brand}`,
    body: `${brand} (${STAGE_LABELS[lead.stage] ?? lead.stage}${spaceCode ? `, interested in ${spaceCode}` : ""}) had a next action due on ${lead.next_action_date}. Owner: ${lead.owner_name ?? "unassigned"}. Recommended: call or email today to keep the enquiry warm.`,
  };
}

/** weekly_summary (medium risk): manager digest drafted from live numbers. */
export function draftWeeklySummary(stats: {
  newEnquiries: number;
  viewingsHeld: number;
  offersSent: number;
  signed: number;
  lost: number;
  occupancyPct: number;
  outstandingRent: number;
  overdueFollowUps: number;
}): EmailDraft {
  const s = stats;
  return {
    subject: `Leasing weekly summary — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    body:
      `This week at a glance:\n\n` +
      `• New enquiries: ${s.newEnquiries}\n` +
      `• Viewings held: ${s.viewingsHeld}\n` +
      `• Offers sent: ${s.offersSent}\n` +
      `• Signed: ${s.signed} · Lost: ${s.lost}\n` +
      `• Occupancy: ${s.occupancyPct}%\n` +
      `• Outstanding rent: ${formatMoney(s.outstandingRent)}\n` +
      `• Overdue follow-ups needing attention: ${s.overdueFollowUps}\n\n` +
      `Focus for next week: clear the overdue follow-ups and convert open offers before their validity dates lapse.`,
  };
}
