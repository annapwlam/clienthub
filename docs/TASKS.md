# Tasks & Sprints

## Sprint 1 — Database + Lead Pipeline (core engine)
**Goal:** Lead CRUD and pipeline board working end-to-end against the DB, viewable without login.

- [ ] Run migration SQL (all tables + seed data)
- [ ] `/leads` page: pipeline board grouped by stage (loading / empty / populated states)
- [ ] Lead card: name, company, stage, owner, deal value, score badge
- [ ] **Add Lead** form: full_name, company, email, phone, source, stage, owner_name, deal_value — persists to DB
- [ ] Lead detail page: all fields + follow-up history
- [ ] **Edit Lead** inline: stage, owner, value, next_action_date
- [ ] **Add Follow-up** form on lead detail: note, outcome, next_action_date — persists to follow_ups
- [ ] **Mark Won** button → updates lead.stage, creates deals row, logs activity
- [ ] **Mark Lost** button → modal captures lost_reason, updates lead.stage, logs activity
- [ ] Error toast on failed DB write; skeleton loaders on fetch; empty-state copy on zero leads

**Definition of Done:** Open `/leads` cold — seed board renders. Add a new lead → appears on board. Log follow-up → shows in detail. Mark Won → deal created. Mark Lost → reason stored. Refresh → all data persists.

---

## Sprint 2 — Management Dashboard ✅ v1 functional milestone
**Goal:** Bird's-eye metrics derived from live DB, no hardcoded numbers.

- [ ] `/dashboard` page (no login required)
- [ ] Pipeline summary: total leads, count per stage
- [ ] Win rate: Won / (Won + Lost) × 100
- [ ] Revenue forecast: sum of open deal values × stage probability weights
- [ ] Overdue follow-ups: leads where next_action_date < today
- [ ] Top performers table: wins per owner_name
- [ ] All widgets show loading skeleton + empty state + error state

**Definition of Done:** Dashboard shows live counts. Add a lead in Sprint 1 UI → dashboard count increments. Mark Won → win rate updates. All widgets render correctly with zero data (empty state, not crash).

---

## Sprint 3 — Activity Feed + Lead Scoring
**Goal:** Every action is logged; leads are ranked by conversion likelihood.

- [ ] Auto-insert `activities` row on: lead create, stage change, follow-up logged, won, lost
- [ ] Activity timeline on lead detail page (most recent first)
- [ ] Rule-based score function: compute 0–100 from stage, follow-up count, recency, deal value, source
- [ ] Store score + score_source + score_confidence + score_review_status on leads row
- [ ] Score badge on pipeline card; pipeline sortable by score
- [ ] (Optional) LLM score rationale: call OpenAI, store result; review_status = 'unreviewed'

**Definition of Done:** Create a lead → activity row appears. Change stage → new activity row. Score badge shows on card. Sort by score → highest-scored lead is first.

---

## Sprint 4 — Lock It Down (auth + per-user RLS)
**Goal:** Data is owner-scoped; anonymous visitors see only demo data.

- [ ] Supabase Auth: login + signup pages
- [ ] On create: attach `auth.uid()` to `user_id` on all rows
- [ ] Replace v1 permissive RLS with `auth.uid() = user_id` owner policies on all tables
- [ ] Manager role: can see all leads in their team (RLS via memberships join)
- [ ] Admin role: sees all data
- [ ] Teams UI: create team, invite rep by email, assign role
- [ ] Anonymous visitors: `/leads` and `/dashboard` show demo-only rows (seeded, not private)
- [ ] Confirm cross-user data isolation with two test accounts before any real client data enters

**Definition of Done:** Log in as Rep A → see only Rep A's leads. Log in as Manager → see whole team. Anonymous → see only seed rows. No row from User A is readable by User B.

---

## Sprint 5 — Project Performance + Profitability
**Goal:** Track cost, margin, and man-hours per deal.

- [ ] `projects` table linked to deals
- [ ] `time_entries` table: project_id, hours, rep, date
- [ ] Cost and margin fields editable on deal detail
- [ ] Project performance view: hours logged vs budget, margin %
- [ ] Profitability dashboard panel: revenue vs cost per rep / team / period
- [ ] Customer outcome fields: satisfaction_score, churn_risk (flag), upsell_notes

**Definition of Done:** Create a deal → link a project → log 10 hours → profitability panel shows revenue, cost, and margin correctly.

---

## Sprint 6 — Agentic Actions
**Goal:** AI drafts follow-up emails and reminders; all agent actions require approval before execution.

- [ ] `draft_follow_up_email` tool: generates email from lead context, displays in approval modal
- [ ] Rep approves/edits draft → `send_email` tool dispatches (high risk — logs to audit_logs with approval)
- [ ] Overdue reminder tool: queues reminder, manager approves before dispatch
- [ ] AI weekly summary: drafted, shown to manager, published on approval
- [ ] Audit log page: table of all agent actions with actor, action, risk level, approval status
- [ ] No raw run_any or send_any; only named tools from approved list

**Definition of Done:** Draft email appears in modal from lead context. Sending only occurs after rep clicks Approve. Audit log shows the entry with approval_status = 'approved'.

---

## Gantt (sprint → features)
```
Sprint 1 │ DB schema · Lead CRUD · Pipeline board · Follow-up log · Won/Lost flow
Sprint 2 │ Dashboard · Win rate · Forecast · Overdue list           ← v1 functional
Sprint 3 │ Activity feed · Rule-based scoring · Score badge
Sprint 4 │ Auth · RLS lockdown · Team management
Sprint 5 │ Projects · Time entries · Profitability panel
Sprint 6 │ AI email draft · Reminders · Audit log surface
```
