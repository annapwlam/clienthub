# Test Plan

## Core Success Scenario (manual, no login required)

### Setup
1. Open `/leads` — confirm 5 seeded leads render across pipeline stages.
2. Open `/dashboard` — confirm win rate, pipeline count, and overdue list show non-zero values from seed data.

### Lead Creation
3. Click **Add Lead** → fill: "Acme Corp", Jane Doe, jane@acme.com, source=referral, stage=New, owner=self, value=$30,000.
4. Submit → lead card appears in **New** column.
5. Refresh page → lead still present (DB persisted).

### Follow-Up
6. Click Acme Corp card → lead detail opens.
7. Click **Add Follow-up** → enter note="Intro call done, interested", outcome=positive, next_action_date=+3 days.
8. Submit → follow-up appears in timeline on detail page.
9. Refresh → follow-up still present.

### Stage Progression
10. Edit lead → change stage to **Proposal** → save.
11. Lead card moves to Proposal column on board.
12. Activity feed on detail shows "Stage moved to Proposal".

### Conversion
13. Click **Mark Won** on Acme Corp lead.
14. Lead disappears from active pipeline; appears in Won column.
15. Navigate to `/dashboard` → win rate has increased; Acme Corp appears in top-performer row for owner.
16. Confirm a Deal row was created (check Supabase table or deals list view).

### Lost Flow
17. Add a second lead "Beta Inc". Click **Mark Lost** → enter reason "Budget cut".
18. Lead stage = lost. lost_reason stored. Dashboard win rate unchanged (new Lost offsets).

## Empty & Error States
| Scenario | Expected |
|---|---|
| `/leads` with no rows | Empty-state illustration + "Add your first lead" CTA |
| DB write fails (network off) | Error toast: "Couldn't save. Please try again." |
| `/dashboard` with 0 won leads | Win rate shows 0%; no divide-by-zero crash |
| Lead detail for non-existent ID | 404 message, not blank page |
| Follow-up submitted with blank note | Inline validation: "Note is required" |

## Scoring (Sprint 3)
18. Create lead: stage=Proposal, 3 follow-ups, last contact today, value=$25k, source=referral.
19. Trigger score → expect score ≈ 95 (30+20+20+15+10).
20. Score badge visible on card; `score_review_status='unreviewed'` in DB.

## Auth Isolation (Sprint 4)
21. Log in as Rep A → create lead "Rep A Lead".
22. Log in as Rep B → confirm "Rep A Lead" is not visible.
23. Log in as Manager → confirm both leads are visible.
