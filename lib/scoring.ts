// Rule-based lead scoring per docs/INTELLIGENCE_LAYER.md.
// Signals: stage=proposal +30, follow-ups>=3 +20, last contact <=7d +20,
// value > $20k +15, source=referral +10, no contact in 14+ days -20.

interface ScoreInput {
  stage: string;
  deal_value: number | null;
  source: string | null;
  followUpCount: number;
  lastContactAt: string | null; // most recent contacted_at/created_at of follow-ups
  createdAt: string;
}

export interface ScoreResult {
  score: number;
  score_source: "rule_engine";
  score_confidence: number;
  score_review_status: "unreviewed";
}

export function computeScore(input: ScoreInput): ScoreResult {
  let score = 0;
  let signals = 0;

  if (input.stage === "proposal") score += 30;
  if (input.followUpCount >= 3) score += 20;

  const last = input.lastContactAt ?? input.createdAt;
  const daysSince = (Date.now() - new Date(last).getTime()) / 86_400_000;
  if (input.followUpCount > 0 && daysSince <= 7) score += 20;
  if ((input.deal_value ?? 0) > 20_000) score += 15;
  if (input.source === "referral") score += 10;
  if (daysSince >= 14) score -= 20;

  // Confidence rises with the amount of evidence behind the score.
  if (input.followUpCount > 0) signals += 1;
  if (input.deal_value != null && input.deal_value > 0) signals += 1;
  if (input.source) signals += 1;
  const confidence = Math.min(0.95, 0.5 + signals * 0.15);

  return {
    score: Math.max(0, Math.min(100, score)),
    score_source: "rule_engine",
    score_confidence: Number(confidence.toFixed(2)),
    score_review_status: "unreviewed",
  };
}
