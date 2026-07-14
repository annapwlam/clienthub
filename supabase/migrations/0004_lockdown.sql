-- 0004: Lock it down — owner-scoped RLS, roles, invited memberships.
-- After this migration:
--   · anonymous visitors can READ demo rows (user_id is null) but write nothing
--   · signed-in users own what they create (user_id = auth.uid())
--   · reps see demo rows + their own rows; managers/admins see everything
--   · memberships are managed by admins; invites are linked by email on signup

-- ── Role helpers (security definer avoids RLS recursion on memberships) ─────
create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and role in ('manager', 'admin')
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ── Invited memberships: link user_id by email at signup ────────────────────
alter table memberships add column if not exists invited_email text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update memberships set user_id = new.id
  where user_id is null
    and invited_email is not null
    and lower(invited_email) = lower(new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed memberships: project owner is admin; demo manager account.
insert into memberships (id, team_id, role, invited_email) values
  ('cd000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'admin',   'annapwlam@gmail.com'),
  ('cd000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'manager', 'manager@clienthub.demo')
on conflict (id) do nothing;

-- Demo accounts for testing role isolation (pre-confirmed, password: ClienthubDemo1!)
-- rep.a / rep.b are plain reps; manager@ is linked to the manager membership above
-- by the on_auth_user_created trigger.
do $$
declare
  acct record;
begin
  for acct in
    select * from (values
      ('de000000-0000-0000-0000-00000000000a'::uuid, 'rep.a@clienthub.demo'),
      ('de000000-0000-0000-0000-00000000000b'::uuid, 'rep.b@clienthub.demo'),
      ('de000000-0000-0000-0000-00000000000c'::uuid, 'manager@clienthub.demo')
    ) as t(uid, email)
  loop
    if not exists (select 1 from auth.users where email = acct.email) then
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', acct.uid, 'authenticated', 'authenticated',
        acct.email, extensions.crypt('ClienthubDemo1!', extensions.gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
      insert into auth.identities (id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), acct.uid, acct.uid::text,
        jsonb_build_object('sub', acct.uid::text, 'email', acct.email),
        'email', now(), now(), now());
    end if;
  end loop;
end $$;

-- Link any invited users who signed up before this migration ran.
update memberships m set user_id = u.id
from auth.users u
where m.user_id is null
  and m.invited_email is not null
  and lower(m.invited_email) = lower(u.email);

-- ── Owner-scoped policies for user data tables ───────────────────────────────
-- (leads, follow_ups, deals, activities, viewings, offers, tenancies, rent_invoices)
do $$
declare t text;
begin
  foreach t in array array['leads','follow_ups','deals','activities','viewings','offers','tenancies','rent_invoices']
  loop
    execute format('drop policy if exists "%s_v1_read" on %I', t, t);
    execute format('drop policy if exists "%s_v1_write" on %I', t, t);
    execute format('drop policy if exists "%s_read" on %I', t, t);
    execute format('drop policy if exists "%s_insert" on %I', t, t);
    execute format('drop policy if exists "%s_update" on %I', t, t);
    execute format('drop policy if exists "%s_delete" on %I', t, t);
    -- demo rows (user_id null) are public read; own rows; managers see all
    execute format(
      'create policy "%s_read" on %I for select using (user_id is null or user_id = auth.uid() or public.is_manager())',
      t, t);
    -- writes require sign-in and stamp ownership
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

-- ── Shared inventory & teams: public read, authenticated write ──────────────
drop policy if exists "spaces_v1_read" on spaces;
drop policy if exists "spaces_v1_write" on spaces;
drop policy if exists "spaces_read" on spaces;
drop policy if exists "spaces_write" on spaces;
create policy "spaces_read" on spaces for select using (true);
create policy "spaces_write" on spaces for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "teams_v1_read" on teams;
drop policy if exists "teams_v1_write" on teams;
drop policy if exists "teams_read" on teams;
drop policy if exists "teams_write" on teams;
create policy "teams_read" on teams for select using (true);
create policy "teams_write" on teams for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Memberships: read own / managers read all; admins manage ────────────────
drop policy if exists "memberships_v1_read" on memberships;
drop policy if exists "memberships_v1_write" on memberships;
drop policy if exists "memberships_read" on memberships;
drop policy if exists "memberships_write" on memberships;
create policy "memberships_read" on memberships for select
  using (user_id = auth.uid() or public.is_manager());
create policy "memberships_write" on memberships for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Audit logs: append by any signed-in user, readable by managers ──────────
drop policy if exists "audit_logs_v1_read" on audit_logs;
drop policy if exists "audit_logs_v1_write" on audit_logs;
drop policy if exists "audit_logs_read" on audit_logs;
drop policy if exists "audit_logs_insert" on audit_logs;
create policy "audit_logs_read" on audit_logs for select using (public.is_manager());
create policy "audit_logs_insert" on audit_logs for insert
  with check (auth.uid() is not null and user_id = auth.uid());
