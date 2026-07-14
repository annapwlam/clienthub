-- 0007: Sprint 6 — agentic layer. Every agent output is a task that a human
-- approves or rejects before anything is dispatched. RLS matches 0004.

create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  lead_id uuid references leads(id),
  task_type text not null, -- draft_follow_up_email | schedule_reminder | weekly_summary
  subject text,
  body text,
  payload jsonb,
  risk_level text not null default 'medium',
  status text not null default 'pending', -- pending | approved | rejected | sent
  approved_by text,
  created_at timestamptz not null default now()
);
alter table agent_tasks enable row level security;

drop policy if exists "agent_tasks_read" on agent_tasks;
drop policy if exists "agent_tasks_insert" on agent_tasks;
drop policy if exists "agent_tasks_update" on agent_tasks;
drop policy if exists "agent_tasks_delete" on agent_tasks;
create policy "agent_tasks_read" on agent_tasks for select
  using (user_id is null or user_id = auth.uid() or public.is_manager());
create policy "agent_tasks_insert" on agent_tasks for insert
  with check (auth.uid() is not null and user_id = auth.uid());
create policy "agent_tasks_update" on agent_tasks for update
  using (user_id = auth.uid() or public.is_manager());
create policy "agent_tasks_delete" on agent_tasks for delete
  using (user_id = auth.uid() or public.is_manager());
