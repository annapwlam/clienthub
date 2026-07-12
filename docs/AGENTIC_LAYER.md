# Agentic Layer

## Risk Levels & Actions

### Low — Auto-execute (no approval needed)
- Tag lead source from follow-up note (`tag_lead_source`)
- Compute and update lead score (`score_lead`)
- Log activity on stage change (`log_activity`)

### Medium — Light approval (manager confirms)
- Draft follow-up email from lead context (`draft_follow_up_email`) → shown to rep → rep clicks Send
- Set overdue follow-up reminder (`schedule_reminder`) → manager approves before dispatch

### High — Always approval (manager + admin confirm)
- Send external email to client (`send_email`) — requires human review of draft
- Bulk-update lead owner on team change (`reassign_leads`)

### Critical — Human-only (no agent)
- Delete lead or deal records
- Issue refunds or modify billing
- Legal/contract actions

## Named Tools (approved list)
| Tool | Risk | Description |
|---|---|---|
| `score_lead` | low | Recalculate score from rule engine |
| `tag_lead_source` | low | Infer source tag from note text |
| `log_activity` | low | Write activity row |
| `draft_follow_up_email` | medium | Generate email draft, return text for approval |
| `schedule_reminder` | medium | Queue a reminder, pending manager approval |
| `send_email` | high | Dispatch approved email to client |
| `reassign_leads` | high | Bulk owner update, pending approval |

No `run_any`, `exec_sql`, or `send_any` tools are permitted.

## Audit Log Fields
Every agent action writes to `audit_logs`: `actor`, `action`, `target_table`, `target_id`, `payload` (inputs + output), `risk_level`, `approval_status`, `approved_by`.

## v1 vs Later
- **v1**: `score_lead` + `log_activity` only (low risk, auto)
- **Sprint 6**: `draft_follow_up_email` + `send_email` with approval flow
