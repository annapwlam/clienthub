-- 0003: Rent invoicing / billing schedule for tenancies.
-- Permissive v1 RLS (same as 0001/0002); owner policies come in the lock-down sprint.

create table if not exists rent_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  tenancy_id uuid references tenancies(id),
  space_id uuid references spaces(id),
  period_start date not null,
  period_end date not null,
  due_date date not null,
  amount numeric not null,
  status text not null default 'due', -- due | paid | void (overdue is derived)
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table rent_invoices enable row level security;
drop policy if exists "rent_invoices_v1_read" on rent_invoices;
create policy "rent_invoices_v1_read" on rent_invoices for select using (true);
drop policy if exists "rent_invoices_v1_write" on rent_invoices;
create policy "rent_invoices_v1_write" on rent_invoices for all using (true) with check (true);

-- Seed: Vertex lease — first month paid, second month due.
insert into rent_invoices (id, tenancy_id, space_id, period_start, period_end, due_date, amount, status, paid_at) values
  ('ab000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006',
   current_date - 12, current_date + 18, current_date - 12, 9500, 'paid', now() - interval '10 days'),
  ('ab000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006',
   current_date + 19, current_date + 49, current_date + 19, 9500, 'due', null)
on conflict (id) do nothing;

-- Seed: Sparkle pop-up licence — single invoice, due at start.
insert into rent_invoices (id, tenancy_id, space_id, period_start, period_end, due_date, amount, status) values
  ('ab000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   current_date + 6, current_date + 19, current_date + 6, 11200, 'due')
on conflict (id) do nothing;
