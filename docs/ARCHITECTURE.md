# Architecture

## Stack
- **Frontend** — Next.js 14 (App Router), Tailwind CSS
- **Backend / DB** — Supabase (Postgres + RLS + Realtime)
- **Hosting** — Vercel
- **AI** — OpenAI API (Sprint 3+, optional; core runs without it)

## Now vs Later
| Now (v1) | Later |
|---|---|
| Lead CRUD + pipeline board | Auth, RLS owner policies |
| Follow-up log | Email/Slack reminders |
| Deal auto-creation on Win | Project time-tracking |
| Management dashboard | AI scoring, email drafts |

## Key User Action — Lead to Won Deal
1. Rep fills **Add Lead** form → validated in browser
2. Row inserted into `leads` table; `activities` row auto-logged
3. Rep opens lead detail, adds a **Follow-up** → `follow_ups` row saved
4. Rep changes stage to **Won** → `leads.stage` updated; `deals` row created; activity logged
5. Dashboard query re-aggregates win rate and forecast from live DB
6. (Sprint 3) Rule engine scores lead 0–100; score stored with `source`, `confidence`, `review_status`
7. (Sprint 6) Agent drafts follow-up email → shown for approval → sent only after human confirms

## Layer Plan
1. **Data layer** — tables, constraints, RLS (done first; app logic depends on it)
2. **App logic** — CRUD, stage transitions, auto-Deal creation, dashboard queries
3. **Intelligence** — rule-based scoring → LLM scoring → agentic email drafts

The app is fully functional at layer 2 with no AI. AI adds speed and ranking, never replaces the core.
