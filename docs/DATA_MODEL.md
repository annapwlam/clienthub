# Data Model

## teams
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable until auth sprint |
| name | text | |
| created_at | timestamptz | |

## memberships
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| team_id | uuid FK → teams | |
| role | text | 'rep' \| 'manager' \| 'admin' |
| created_at | timestamptz | |

## leads
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| team_id | uuid FK → teams | |
| full_name | text | |
| company | text | |
| email | text | |
| phone | text | |
| source | text | referral, linkedin, event, website, cold_outreach |
| stage | text | new, qualified, proposal, won, lost |
| owner_name | text | free text until auth sprint |
| deal_value | numeric | |
| currency | text | default USD |
| lost_reason | text | |
| **score** | numeric | **AI field** |
| **score_source** | text | rule_engine \| openai |
| **score_confidence** | numeric | 0.0–1.0 |
| **score_review_status** | text | unreviewed \| reviewed \| overridden |
| next_action_date | date | |
| created_at | timestamptz | |

## follow_ups
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| lead_id | uuid FK → leads | |
| note | text | |
| outcome | text | pending, positive, negative, no_response, won |
| next_action_date | date | |
| contacted_at | timestamptz | |
| created_at | timestamptz | |

## deals
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| lead_id | uuid FK → leads | |
| team_id | uuid FK → teams | |
| title | text | |
| value | numeric | |
| currency | text | |
| cost | numeric | |
| margin | numeric | computed: value − cost |
| status | text | active, completed, cancelled |
| closed_at | timestamptz | |
| created_at | timestamptz | |

## activities
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| lead_id | uuid FK → leads | nullable |
| deal_id | uuid FK → deals | nullable |
| action_type | text | lead_created, stage_change, follow_up_logged, lead_won, lead_lost |
| description | text | |
| performed_by | text | |
| created_at | timestamptz | |

## audit_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| actor | text | |
| action | text | |
| target_table | text | |
| target_id | uuid | |
| payload | jsonb | |
| risk_level | text | low, medium, high, critical |
| approval_status | text | auto, pending, approved, rejected |
| approved_by | text | |
| created_at | timestamptz | |

## RLS
- All tables: permissive v1 policies (select + all using true) for demo sprint.
- Lock-down sprint replaces with `auth.uid() = user_id` owner policies.
