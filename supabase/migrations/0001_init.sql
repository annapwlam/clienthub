create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  created_at timestamptz not null default now()
);
alter table teams enable row level security;
drop policy if exists "teams_v1_read" on teams;
create policy "teams_v1_read" on teams for select using (true);
drop policy if exists "teams_v1_write" on teams;
create policy "teams_v1_write" on teams for all using (true) with check (true);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  team_id uuid references teams(id),
  role text not null default 'rep',
  created_at timestamptz not null default now()
);
alter table memberships enable row level security;
drop policy if exists "memberships_v1_read" on memberships;
create policy "memberships_v1_read" on memberships for select using (true);
drop policy if exists "memberships_v1_write" on memberships;
create policy "memberships_v1_write" on memberships for all using (true) with check (true);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  team_id uuid references teams(id),
  full_name text not null,
  company text,
  email text,
  phone text,
  source text,
  stage text not null default 'new',
  owner_name text,
  deal_value numeric default 0,
  currency text default 'USD',
  lost_reason text,
  score numeric,
  score_source text,
  score_confidence numeric,
  score_review_status text default 'unreviewed',
  next_action_date date,
  created_at timestamptz not null default now()
);
alter table leads enable row level security;
drop policy if exists "leads_v1_read" on leads;
create policy "leads_v1_read" on leads for select using (true);
drop policy if exists "leads_v1_write" on leads;
create policy "leads_v1_write" on leads for all using (true) with check (true);

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  lead_id uuid references leads(id),
  note text,
  outcome text,
  next_action_date date,
  contacted_at timestamptz default now(),
  created_at timestamptz not null default now()
);
alter table follow_ups enable row level security;
drop policy if exists "follow_ups_v1_read" on follow_ups;
create policy "follow_ups_v1_read" on follow_ups for select using (true);
drop policy if exists "follow_ups_v1_write" on follow_ups;
create policy "follow_ups_v1_write" on follow_ups for all using (true) with check (true);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  lead_id uuid references leads(id),
  team_id uuid references teams(id),
  title text not null,
  value numeric default 0,
  currency text default 'USD',
  cost numeric default 0,
  margin numeric,
  status text not null default 'active',
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table deals enable row level security;
drop policy if exists "deals_v1_read" on deals;
create policy "deals_v1_read" on deals for select using (true);
drop policy if exists "deals_v1_write" on deals;
create policy "deals_v1_write" on deals for all using (true) with check (true);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  lead_id uuid references leads(id),
  deal_id uuid references deals(id),
  action_type text not null,
  description text,
  performed_by text,
  created_at timestamptz not null default now()
);
alter table activities enable row level security;
drop policy if exists "activities_v1_read" on activities;
create policy "activities_v1_read" on activities for select using (true);
drop policy if exists "activities_v1_write" on activities;
create policy "activities_v1_write" on activities for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  actor text,
  action text not null,
  target_table text,
  target_id uuid,
  payload jsonb,
  risk_level text,
  approval_status text default 'auto',
  approved_by text,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into teams (id, name) values
  ('a1000000-0000-0000-0000-000000000001', 'Sales Team Alpha');

insert into leads (id, team_id, full_name, company, email, phone, source, stage, owner_name, deal_value, score, score_source, score_confidence, score_review_status, next_action_date) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Maria Santos', 'Pinnacle Corp', 'maria@pinnacle.com', '+1-555-0101', 'referral', 'proposal', 'Alex R.', 45000, 78, 'rule_engine', 0.82, 'unreviewed', current_date + 2),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'James Okafor', 'BlueSky Ltd', 'james@bluesky.io', '+1-555-0202', 'linkedin', 'qualified', 'Dana K.', 22000, 55, 'rule_engine', 0.70, 'unreviewed', current_date + 5),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Priya Nair', 'Nexus Solutions', 'priya@nexus.co', '+1-555-0303', 'cold_outreach', 'new', 'Alex R.', 8000, 30, 'rule_engine', 0.60, 'unreviewed', current_date + 7),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Tom Brennan', 'Vertex Inc', 'tom@vertex.com', '+1-555-0404', 'website', 'won', 'Dana K.', 60000, 95, 'rule_engine', 0.95, 'reviewed', null),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Yuki Tanaka', 'Horizon Group', 'yuki@horizon.jp', '+1-555-0505', 'event', 'lost', 'Alex R.', 15000, 20, 'rule_engine', 0.55, 'unreviewed', null);

insert into follow_ups (lead_id, note, outcome, next_action_date) values
  ('b1000000-0000-0000-0000-000000000001', 'Sent proposal deck. Client asked for pricing revision.', 'pending', current_date + 2),
  ('b1000000-0000-0000-0000-000000000002', 'Discovery call done. Strong interest in Q3 delivery.', 'positive', current_date + 5),
  ('b1000000-0000-0000-0000-000000000003', 'Left voicemail. No response yet.', 'no_response', current_date + 7),
  ('b1000000-0000-0000-0000-000000000004', 'Contract signed. Kickoff scheduled for next Monday.', 'won', null);

insert into deals (lead_id, team_id, title, value, currency, cost, margin, status, closed_at) values
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Vertex Inc — Full Implementation', 60000, 'USD', 22000, 38000, 'active', now());

insert into activities (lead_id, action_type, description, performed_by) values
  ('b1000000-0000-0000-0000-000000000001', 'stage_change', 'Stage moved from Qualified to Proposal', 'Alex R.'),
  ('b1000000-0000-0000-0000-000000000004', 'lead_won', 'Lead marked as Won. Deal created.', 'Dana K.'),
  ('b1000000-0000-0000-0000-000000000005', 'lead_lost', 'Lead marked as Lost. Reason: Budget constraints.', 'Alex R.');