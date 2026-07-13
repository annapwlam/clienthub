-- 0002: Mall space-leasing CRM — spaces inventory, enquiry fields, viewings,
-- offers, tenancies (long-term leases + short-term licences/bookings).
-- Permissive v1 RLS (same as 0001); owner policies come in the lock-down sprint.

-- ── Spaces inventory ─────────────────────────────────────────────────────────
create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  code text not null unique,           -- e.g. L1-05, K-01, G-01
  name text not null,
  space_type text not null default 'unit',  -- unit | kiosk | atrium | event_space
  floor text,
  zone text,
  size_sqft numeric,
  rent_monthly numeric,                -- long-term asking rent
  rate_daily numeric,                  -- short-term licence rate
  status text not null default 'vacant', -- vacant | reserved | occupied | maintenance
  suitable_for text,
  notes text,
  created_at timestamptz not null default now()
);
alter table spaces enable row level security;
drop policy if exists "spaces_v1_read" on spaces;
create policy "spaces_v1_read" on spaces for select using (true);
drop policy if exists "spaces_v1_write" on spaces;
create policy "spaces_v1_write" on spaces for all using (true) with check (true);

-- ── Enquiry fields on leads ──────────────────────────────────────────────────
alter table leads add column if not exists enquiry_type text default 'long_term'; -- long_term | short_term
alter table leads add column if not exists brand_name text;
alter table leads add column if not exists business_type text;   -- fnb, fashion, services, entertainment, popup_retail, events, other
alter table leads add column if not exists space_id uuid references spaces(id);
alter table leads add column if not exists preferred_size_sqft numeric;
alter table leads add column if not exists budget numeric;        -- monthly budget (LT) or total budget (ST)
alter table leads add column if not exists target_start_date date;
alter table leads add column if not exists duration_value integer;
alter table leads add column if not exists duration_unit text;    -- days | months | years

-- ── Viewings (site visits) ───────────────────────────────────────────────────
create table if not exists viewings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  lead_id uuid references leads(id),
  space_id uuid references spaces(id),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled', -- scheduled | completed | no_show | cancelled
  feedback text,
  created_at timestamptz not null default now()
);
alter table viewings enable row level security;
drop policy if exists "viewings_v1_read" on viewings;
create policy "viewings_v1_read" on viewings for select using (true);
drop policy if exists "viewings_v1_write" on viewings;
create policy "viewings_v1_write" on viewings for all using (true) with check (true);

-- ── Offers / quotations ──────────────────────────────────────────────────────
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  lead_id uuid references leads(id),
  space_id uuid references spaces(id),
  offer_type text not null default 'long_term', -- long_term | short_term
  rent_monthly numeric,          -- long-term
  fee_total numeric,             -- short-term licence fee
  deposit numeric,
  term_months integer,           -- long-term
  start_date date,
  end_date date,
  rent_free_weeks integer default 0,
  valid_until date,
  status text not null default 'draft', -- draft | sent | negotiating | accepted | rejected | expired
  notes text,
  created_at timestamptz not null default now()
);
alter table offers enable row level security;
drop policy if exists "offers_v1_read" on offers;
create policy "offers_v1_read" on offers for select using (true);
drop policy if exists "offers_v1_write" on offers;
create policy "offers_v1_write" on offers for all using (true) with check (true);

-- ── Tenancies: long-term leases AND short-term licences (bookings) ──────────
create table if not exists tenancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  lead_id uuid references leads(id),
  offer_id uuid references offers(id),
  space_id uuid references spaces(id),
  tenancy_type text not null default 'lease', -- lease (long-term) | licence (short-term booking)
  tenant_name text not null,
  start_date date not null,
  end_date date not null,
  rent_monthly numeric,
  fee_total numeric,
  deposit numeric,
  status text not null default 'pending_signing', -- pending_signing | fitout | active | ended | terminated
  notes text,
  created_at timestamptz not null default now()
);
alter table tenancies enable row level security;
drop policy if exists "tenancies_v1_read" on tenancies;
create policy "tenancies_v1_read" on tenancies for select using (true);
drop policy if exists "tenancies_v1_write" on tenancies;
create policy "tenancies_v1_write" on tenancies for all using (true) with check (true);

-- ── Seed: spaces ─────────────────────────────────────────────────────────────
insert into spaces (id, code, name, space_type, floor, zone, size_sqft, rent_monthly, rate_daily, status, suitable_for) values
  ('c1000000-0000-0000-0000-000000000001', 'G-01',  'Grand Atrium East',   'atrium',      'G',  'East Wing',   1200, null,  800, 'reserved', 'Pop-ups, product launches, roadshows'),
  ('c1000000-0000-0000-0000-000000000002', 'G-02',  'Central Court',       'event_space', 'G',  'Centre',      2000, null, 1500, 'vacant',   'Events, exhibitions, seasonal markets'),
  ('c1000000-0000-0000-0000-000000000003', 'K-01',  'Kiosk — Main Walkway','kiosk',       '1',  'Main Walkway',  80, 2500,  150, 'vacant',   'Snacks, accessories, phone services'),
  ('c1000000-0000-0000-0000-000000000004', 'K-02',  'Kiosk — Cinema Foyer','kiosk',       '2',  'Cinema Foyer',  80, 2200,  140, 'vacant',   'Confectionery, toys, promotions'),
  ('c1000000-0000-0000-0000-000000000005', 'L1-05', 'Retail Unit L1-05',   'unit',        '1',  'North Wing',   850, 6800, null, 'vacant',   'Fashion, lifestyle retail'),
  ('c1000000-0000-0000-0000-000000000006', 'L1-12', 'Retail Unit L1-12',   'unit',        '1',  'Main Walkway',1200, 9500, null, 'occupied', 'Anchor-adjacent retail'),
  ('c1000000-0000-0000-0000-000000000007', 'L2-08', 'Retail Unit L2-08',   'unit',        '2',  'South Wing',   950, 7200, null, 'vacant',   'Services, electronics'),
  ('c1000000-0000-0000-0000-000000000008', 'L2-21', 'F&B Unit L2-21',      'unit',        '2',  'Food Street', 1500,12000, null, 'vacant',   'Restaurant / cafe (grease trap ready)'),
  ('c1000000-0000-0000-0000-000000000009', 'L3-02', 'Retail Unit L3-02',   'unit',        '3',  'West Wing',    700, 5200, null, 'maintenance', 'Under refurbishment until further notice')
on conflict (id) do nothing;

-- ── Seed: classify existing demo enquiries ───────────────────────────────────
update leads set enquiry_type='long_term',  brand_name='Pinnacle Fashion',   business_type='fashion',      space_id='c1000000-0000-0000-0000-000000000008', preferred_size_sqft=1500, budget=12000, target_start_date=current_date + 45, duration_value=3,  duration_unit='years'  where id='b1000000-0000-0000-0000-000000000001';
update leads set enquiry_type='long_term',  brand_name='BlueSky Living',     business_type='services',     space_id='c1000000-0000-0000-0000-000000000005', preferred_size_sqft=850,  budget=7000,  target_start_date=current_date + 60, duration_value=2,  duration_unit='years'  where id='b1000000-0000-0000-0000-000000000002';
update leads set enquiry_type='short_term', brand_name='Nexus Gadgets',      business_type='popup_retail', space_id='c1000000-0000-0000-0000-000000000003', preferred_size_sqft=80,   budget=4500,  target_start_date=current_date + 21, duration_value=30, duration_unit='days'   where id='b1000000-0000-0000-0000-000000000003';
update leads set enquiry_type='long_term',  brand_name='Vertex Home',        business_type='fashion',      space_id='c1000000-0000-0000-0000-000000000006', preferred_size_sqft=1200, budget=9500,  target_start_date=current_date - 14, duration_value=3,  duration_unit='years'  where id='b1000000-0000-0000-0000-000000000004';
update leads set enquiry_type='short_term', brand_name='Horizon Events',     business_type='events',       space_id='c1000000-0000-0000-0000-000000000002', preferred_size_sqft=2000, budget=20000, target_start_date=current_date + 30, duration_value=14, duration_unit='days'   where id='b1000000-0000-0000-0000-000000000005';

-- ── Seed: a scheduled viewing, an open offer, a live lease, an upcoming booking
insert into viewings (id, lead_id, space_id, scheduled_at, status) values
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000005', now() + interval '2 days', 'scheduled')
on conflict (id) do nothing;

insert into offers (id, lead_id, space_id, offer_type, rent_monthly, deposit, term_months, rent_free_weeks, valid_until, status, notes) values
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000008', 'long_term', 12000, 36000, 36, 4, current_date + 14, 'negotiating', 'Client asked for 6 rent-free weeks; countered at 4.')
on conflict (id) do nothing;

insert into tenancies (id, lead_id, space_id, tenancy_type, tenant_name, start_date, end_date, rent_monthly, deposit, status) values
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000006', 'lease', 'Vertex Home', current_date - 12, current_date + 1083, 9500, 28500, 'active')
on conflict (id) do nothing;

insert into tenancies (id, space_id, tenancy_type, tenant_name, start_date, end_date, fee_total, deposit, status, notes) values
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'licence', 'Sparkle Cosmetics Pop-up', current_date + 7, current_date + 20, 11200, 2000, 'active', 'Confirmed booking — Grand Atrium East')
on conflict (id) do nothing;
