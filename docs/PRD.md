# ClientHub — Product Requirements Document

## Problem
Sales reps have no single place to track leads, follow-ups, and conversion outcomes. Management has no real-time view of pipeline health, team productivity, or profitability — decisions rely on memory or disconnected spreadsheets.

## Target Users
- **Sales / BizDev reps** — capture leads, log follow-ups, record wins and losses.
- **Managers** — monitor pipeline, win rates, revenue forecast, and team output.

## Core Objects
| Object | Purpose |
|---|---|
| Lead | A potential client with stage, owner, and deal value |
| Follow-up | A logged interaction or planned next action on a lead |
| Deal | A won lead converted to an active engagement |
| Activity | Auto-logged event on every state change |
| Team / Membership | Groups reps under a manager |
| Audit Log | Immutable record of every significant action |

## MVP Must-Haves (v1)
- [ ] Create, view, edit, and stage-change leads
- [ ] Log follow-ups (note + outcome + next-action date) per lead
- [ ] Mark lead Won → auto-create Deal; mark Lost → capture reason
- [ ] Pipeline board view (New → Qualified → Proposal → Won / Lost)
- [ ] Management dashboard: pipeline count, win rate, forecast, overdue follow-ups
- [ ] All data persists to DB; no dead buttons; empty/error/loading states handled
- [ ] Viewable without login (demo seed data visible on first load)

## Non-Goals (v1)
- User authentication and per-user data isolation
- Email / Slack integrations
- Project time-tracking and profitability reports
- AI scoring and email drafts

## Definition of Done
A manager opens the app, sees 5 seeded leads across all stages, adds a new lead for "Acme Corp", logs a follow-up with a next-action date, promotes it to Won, sees it appear as a Deal, and the dashboard win-rate updates — all without logging in, all persisted on page refresh.
