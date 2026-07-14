-- 0006: Sprint 5 — projects (fit-out / operations) per tenancy, time tracking,
-- profitability. RLS matches the 0004 lock-down pattern.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  tenancy_id uuid references tenancies(id),
  name text not null,
  status text not null default 'active', -- active | completed | on_hold
  budget_hours numeric,
  budget_cost numeric,
  actual_cost numeric default 0,
  satisfaction_score integer,            -- 1–5, customer outcome
  churn_risk boolean default false,
  upsell_notes text,
  created_at timestamptz not null default now()
);
alter table projects enable row level security;

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references projects(id),
  rep text,
  entry_date date not null default current_date,
  hours numeric not null,
  description text,
  created_at timestamptz not null default now()
);
alter table time_entries enable row level security;

do $$
declare t text;
begin
  foreach t in array array['projects','time_entries']
  loop
    execute format('drop policy if exists "%s_read" on %I', t, t);
    execute format('drop policy if exists "%s_insert" on %I', t, t);
    execute format('drop policy if exists "%s_update" on %I', t, t);
    execute format('drop policy if exists "%s_delete" on %I', t, t);
    execute format(
      'create policy "%s_read" on %I for select using (user_id is null or user_id = auth.uid() or public.is_manager())',
      t, t);
    execute format(
      'create policy "%s_insert" on %I for insert with check (auth.uid() is not null and user_id = auth.uid())',
      t, t);
    execute format(
      'create policy "%s_update" on %I for update using (user_id = auth.uid() or public.is_manager())',
      t, t);
    execute format(
      'create policy "%s_delete" on %I for delete using (user_id = auth.uid() or public.is_manager())',
      t, t);
  end loop;
end $$;

-- Seed: Vertex fit-out project with logged hours (demo rows, user_id null).
insert into projects (id, tenancy_id, name, status, budget_hours, budget_cost, actual_cost, satisfaction_score, churn_risk, upsell_notes) values
  ('ef000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
   'Vertex Home — Fit-out & Onboarding', 'active', 120, 25000, 21500, 4, false,
   'Interested in a second unit on L2 if Q4 sales hold.')
on conflict (id) do nothing;

insert into time_entries (id, project_id, rep, entry_date, hours, description) values
  ('ef100000-0000-0000-0000-000000000001', 'ef000000-0000-0000-0000-000000000001', 'Dana K.', current_date - 9, 24, 'Hoarding up, demolition supervision'),
  ('ef100000-0000-0000-0000-000000000002', 'ef000000-0000-0000-0000-000000000001', 'Dana K.', current_date - 4, 16, 'M&E inspection and utilities connection'),
  ('ef100000-0000-0000-0000-000000000003', 'ef000000-0000-0000-0000-000000000001', 'Alex R.', current_date - 1, 8, 'Signage approval and handover checklist')
on conflict (id) do nothing;
