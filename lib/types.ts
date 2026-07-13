export type Stage = "new" | "qualified" | "proposal" | "won" | "lost";

export const STAGES: Stage[] = ["new", "qualified", "proposal", "won", "lost"];
export const OPEN_STAGES: Stage[] = ["new", "qualified", "proposal"];

export const STAGE_LABELS: Record<Stage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const SOURCES = [
  "referral",
  "linkedin",
  "event",
  "website",
  "cold_outreach",
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  linkedin: "LinkedIn",
  event: "Event",
  website: "Website",
  cold_outreach: "Cold outreach",
};

export const OUTCOMES = [
  "pending",
  "positive",
  "negative",
  "no_response",
  "won",
] as const;

export const OUTCOME_LABELS: Record<string, string> = {
  pending: "Pending",
  positive: "Positive",
  negative: "Negative",
  no_response: "No response",
  won: "Won",
};

// Probability weights per open stage, used for the revenue forecast.
export const STAGE_WEIGHTS: Record<string, number> = {
  new: 0.1,
  qualified: 0.3,
  proposal: 0.6,
};

export interface Lead {
  id: string;
  user_id: string | null;
  team_id: string | null;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: Stage;
  owner_name: string | null;
  deal_value: number | null;
  currency: string | null;
  lost_reason: string | null;
  score: number | null;
  score_source: string | null;
  score_confidence: number | null;
  score_review_status: string | null;
  next_action_date: string | null;
  created_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  note: string | null;
  outcome: string | null;
  next_action_date: string | null;
  contacted_at: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  lead_id: string | null;
  team_id: string | null;
  title: string;
  value: number | null;
  currency: string | null;
  cost: number | null;
  margin: number | null;
  status: string;
  closed_at: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string | null;
  deal_id: string | null;
  action_type: string;
  description: string | null;
  performed_by: string | null;
  created_at: string;
}

export function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
}
