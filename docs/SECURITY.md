# Security

## Secret Handling
- Supabase service-role key and OpenAI key stored in Vercel environment variables only.
- Client receives only the Supabase **anon** key via `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No secrets in frontend code, `.env.local` committed, or client-side logs.

## Permission Model
| Sprint | State |
|---|---|
| v1 (Sprints 1–3) | Permissive RLS (demo-safe, no sensitive data yet) |
| Lock-down (Sprint 4) | `auth.uid() = user_id` owner-scoped RLS on all tables |
| Roles | rep → own leads only; manager → team leads; admin → all |

Role is stored in `memberships.role`; enforced via RLS policies and server-side route guards — never trust client-supplied role claims.

## Approved Tools Rule
Agents may only call named tools listed in `AGENTIC_LAYER.md`. No wildcard tool execution. Every tool call is validated server-side before execution.

## Audit Principle
Every meaningful write — stage change, deal creation, agent action, approval — produces an `audit_logs` row. Audit rows are append-only (no update/delete policy in production). The audit table is the source of truth for what happened and who approved it.

## Sensitive Data
- Client PII (email, phone) encrypted at rest via Supabase (default Postgres encryption).
- In the lock-down sprint: confirm RLS prevents cross-user data reads before any real client data is entered.
- If payment or legal data is added, stop and involve a qualified human — do not self-implement.
