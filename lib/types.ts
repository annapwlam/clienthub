export type Stage =
  | "new"
  | "qualified"
  | "viewing"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

// Leasing funnel order: first enquiry → qualified → viewing → offer →
// negotiation → signed (won) / lost.
export const STAGES: Stage[] = [
  "new",
  "qualified",
  "viewing",
  "proposal",
  "negotiation",
  "won",
  "lost",
];
export const OPEN_STAGES: Stage[] = [
  "new",
  "qualified",
  "viewing",
  "proposal",
  "negotiation",
];

export const STAGE_LABELS: Record<Stage, string> = {
  new: "New Enquiry",
  qualified: "Qualified",
  viewing: "Viewing",
  proposal: "Offer",
  negotiation: "Negotiation",
  won: "Signed",
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
  qualified: 0.25,
  viewing: 0.4,
  proposal: 0.6,
  negotiation: 0.75,
};

export const ENQUIRY_TYPES = ["long_term", "short_term"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];
export const ENQUIRY_TYPE_LABELS: Record<string, string> = {
  long_term: "Long-term lease",
  short_term: "Short-term use",
};

export const BUSINESS_TYPES = [
  "fnb",
  "fashion",
  "services",
  "electronics",
  "entertainment",
  "popup_retail",
  "events",
  "other",
] as const;
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  fnb: "F&B",
  fashion: "Fashion & Lifestyle",
  services: "Services",
  electronics: "Electronics",
  entertainment: "Entertainment",
  popup_retail: "Pop-up Retail",
  events: "Events & Exhibitions",
  other: "Other",
};

export const SPACE_TYPES = ["unit", "kiosk", "atrium", "event_space"] as const;
export const SPACE_TYPE_LABELS: Record<string, string> = {
  unit: "Retail Unit",
  kiosk: "Kiosk",
  atrium: "Atrium",
  event_space: "Event Space",
};

export const SPACE_STATUSES = [
  "vacant",
  "reserved",
  "occupied",
  "maintenance",
] as const;
export type SpaceStatus = (typeof SPACE_STATUSES)[number];

export const VIEWING_STATUSES = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
] as const;

export const OFFER_STATUSES = [
  "draft",
  "sent",
  "negotiating",
  "accepted",
  "rejected",
  "expired",
] as const;

export const TENANCY_STATUSES = [
  "pending_signing",
  "fitout",
  "active",
  "ended",
  "terminated",
] as const;
export const TENANCY_STATUS_LABELS: Record<string, string> = {
  pending_signing: "Pending signing",
  fitout: "Fit-out",
  active: "Active",
  ended: "Ended",
  terminated: "Terminated",
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
  // Leasing enquiry fields (0002)
  enquiry_type: string | null;
  brand_name: string | null;
  business_type: string | null;
  space_id: string | null;
  preferred_size_sqft: number | null;
  budget: number | null;
  target_start_date: string | null;
  duration_value: number | null;
  duration_unit: string | null;
}

export interface Space {
  id: string;
  code: string;
  name: string;
  space_type: string;
  floor: string | null;
  zone: string | null;
  size_sqft: number | null;
  rent_monthly: number | null;
  rate_daily: number | null;
  status: SpaceStatus;
  suitable_for: string | null;
  notes: string | null;
  created_at: string;
}

export interface Viewing {
  id: string;
  lead_id: string | null;
  space_id: string | null;
  scheduled_at: string;
  status: string;
  feedback: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  lead_id: string | null;
  space_id: string | null;
  offer_type: string;
  rent_monthly: number | null;
  fee_total: number | null;
  deposit: number | null;
  term_months: number | null;
  start_date: string | null;
  end_date: string | null;
  rent_free_weeks: number | null;
  valid_until: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Tenancy {
  id: string;
  lead_id: string | null;
  offer_id: string | null;
  space_id: string | null;
  tenancy_type: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_monthly: number | null;
  fee_total: number | null;
  deposit: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export function durationLabel(value: number | null, unit: string | null) {
  if (!value || !unit) return "—";
  return `${value} ${unit}`;
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
