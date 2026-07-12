# Intelligence Layer

## Messy Inputs
- Rep notes are free text ("called twice, no answer, try next week")
- Stage labels are manually set; no consistent follow-up cadence
- Deal values are estimates entered by the rep

## Auto-Structure Schema
Every follow-up note is parsed into:
```json
{
  "sentiment": "positive | negative | neutral",
  "intent_signals": ["pricing_question", "timeline_push", "champion_identified"],
  "next_action_type": "call | email | meeting | wait",
  "urgency": "high | medium | low"
}
```

## Events to Track
- Lead created, stage changed, follow-up logged, won, lost
- Days since last contact, total follow-up count
- Deal value vs team average

## Scoring Rules (v1 — rule-based)
| Signal | Points |
|---|---|
| Stage = Proposal | +30 |
| Follow-up count ≥ 3 | +20 |
| Last contact ≤ 7 days | +20 |
| Deal value > $20k | +15 |
| Source = referral | +10 |
| No contact in 14+ days | −20 |

Score stored as `score` (0–100), `score_source='rule_engine'`, `score_confidence` (0.0–1.0), `score_review_status='unreviewed'`.

## What Gets Ranked
- Leads sorted by score descending on pipeline board
- Overdue follow-ups surfaced at top of management dashboard

## v1 vs Later
| v1 | Later |
|---|---|
| Rule-based score | LLM scoring with rationale text |
| Manual review_status | Auto-escalate low-confidence scores |
| Score shown as badge | Predictive close-date estimate |
