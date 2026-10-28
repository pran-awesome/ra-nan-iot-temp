-- Smart Sop Puen Smart Farm
-- Run this once in the Supabase SQL editor (or via the Supabase CLI).
-- The ESP32 writes through the Vercel /api/ingest route, which uses the service role.
-- Signed-in users can read their own devices and readings. They cannot insert readings.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null unique,
  name text not null,
  location text,
  crop text,
  api_key_preview text,
  expected_interval_seconds integer not null default 300,
  created_at timestamptz not null default now(),
  constraint device_id_format check (device_id ~ '^[A-Za-z0-9_-]{3,64}$'),
  constraint device_name_length check (char_length(name) between 1 and 80)
);

create table if not exists public.device_keys (
  device_id text primary key references public.devices (device_id) on delete cascade,
  api_key_hash text not null unique
);

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  device_id text not null references public.devices (device_id) on delete cascade,
  soil_moisture_raw integer,
  soil_moisture_percent numeric(5, 2),
  water_raw integer,
  light_raw integer,
  air_temperature numeric(4, 1),
  air_humidity numeric(4, 1),
  missing_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists sensor_readings_device_created_idx
  on public.sensor_readings (device_id, created_at desc);
create index if not exists sensor_readings_created_idx
  on public.sensor_readings (created_at desc);
create index if not exists devices_user_idx
  on public.devices (user_id);

create table if not exists public.farm_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  site_name text,
  crop text,
  selected_device_id text,
  moisture_min numeric,
  moisture_max numeric,
  air_temp_min numeric,
  air_temp_max numeric,
  humidity_min numeric,
  humidity_max numeric,
  refresh_seconds integer not null default 30,
  updated_at timestamptz not null default now(),
  constraint settings_moisture_range check (moisture_min < moisture_max),
  constraint settings_temp_range check (air_temp_min < air_temp_max),
  constraint settings_humidity_range check (humidity_min < humidity_max),
  constraint settings_refresh check (refresh_seconds in (15, 30, 60, 120, 300))
);

-- ---------------------------------------------------------------------------
-- Privileges
-- Upload keys never leave the server. Readings are insertable only by the
-- service role (the Vercel ingest route), which bypasses row level security.
-- ---------------------------------------------------------------------------

revoke all on public.device_keys from anon, authenticated;
revoke all on public.sensor_readings from anon, authenticated;
grant select on public.sensor_readings to authenticated;

revoke all on public.devices from anon, authenticated;
grant select, update, delete on public.devices to authenticated;

revoke all on public.farm_settings from anon, authenticated;
grant select, insert, update on public.farm_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.devices enable row level security;
alter table public.device_keys enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.farm_settings enable row level security;

drop policy if exists "own devices read" on public.devices;
create policy "own devices read"
  on public.devices for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own devices update" on public.devices;
create policy "own devices update"
  on public.devices for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own devices delete" on public.devices;
create policy "own devices delete"
  on public.devices for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own readings read" on public.sensor_readings;
create policy "own readings read"
  on public.sensor_readings for select to authenticated
  using (
    exists (
      select 1 from public.devices d
      where d.device_id = sensor_readings.device_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "own settings read" on public.farm_settings;
create policy "own settings read"
  on public.farm_settings for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own settings insert" on public.farm_settings;
create policy "own settings insert"
  on public.farm_settings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "own settings update" on public.farm_settings;
create policy "own settings update"
  on public.farm_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep ownership, the device id, and the key preview from being rewritten
-- by a signed-in browser. The service role (ingest / register / rotate) may.
create or replace function public.protect_device_row()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    new.user_id := old.user_id;
    new.device_id := old.device_id;
    new.api_key_preview := old.api_key_preview;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_device_row on public.devices;
create trigger protect_device_row
  before update on public.devices
  for each row execute function public.protect_device_row();

create or replace function public.touch_farm_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_farm_settings on public.farm_settings;
create trigger touch_farm_settings
  before update on public.farm_settings
  for each row execute function public.touch_farm_settings();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.farm_settings (
    user_id,
    site_name,
    crop,
    moisture_min,
    moisture_max,
    air_temp_min,
    air_temp_max,
    humidity_min,
    humidity_max,
    refresh_seconds
  ) values (
    new.id,
    'My farm',
    'custom',
    40,
    70,
    16,
    33,
    50,
    85,
    30
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Dashboard view: latest reading + uploads in the last 24 hours
-- ---------------------------------------------------------------------------

create or replace view public.device_overview
with (security_invoker = true) as
select
  d.id,
  d.user_id,
  d.device_id,
  d.name,
  d.location,
  d.crop,
  d.api_key_preview,
  d.expected_interval_seconds,
  d.created_at,
  r.id as latest_id,
  r.created_at as latest_at,
  r.soil_moisture_raw,
  r.soil_moisture_percent,
  r.water_raw,
  r.light_raw,
  r.air_temperature,
  r.air_humidity,
  r.missing_fields,
  (
    select count(*)
    from public.sensor_readings s
    where s.device_id = d.device_id
      and s.created_at > now() - interval '24 hours'
  ) as readings_24h
from public.devices d
left join lateral (
  select *
  from public.sensor_readings s
  where s.device_id = d.device_id
  order by s.created_at desc
  limit 1
) r on true;

grant select on public.device_overview to authenticated;

-- ---------------------------------------------------------------------------
-- Chart series and exact stats. Buckets are an allow-list.
-- ---------------------------------------------------------------------------

create or replace function public.reading_series(
  p_device_id text,
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text
)
returns table (
  t timestamptz,
  soil_moisture_percent numeric,
  air_temperature numeric,
  air_humidity numeric,
  water_raw numeric,
  light_raw numeric,
  samples bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_bucket interval;
begin
  if p_bucket not in ('5 minutes', '15 minutes', '2 hours', '8 hours') then
    raise exception 'unsupported bucket';
  end if;
  v_bucket := p_bucket::interval;
  return query
  select
    date_bin(v_bucket, s.created_at, timestamptz '2000-01-01+00') as t,
    avg(s.soil_moisture_percent),
    avg(s.air_temperature),
    avg(s.air_humidity),
    avg(s.water_raw),
    avg(s.light_raw),
    count(*)
  from public.sensor_readings s
  where s.created_at >= p_from
    and s.created_at < p_to
    and (p_device_id is null or s.device_id = p_device_id)
  group by 1
  order by 1;
end;
$$;

create or replace function public.reading_stats(
  p_device_id text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  rows bigint,
  soil_avg numeric,
  soil_min numeric,
  soil_max numeric,
  temp_avg numeric,
  temp_min numeric,
  temp_max numeric,
  humidity_avg numeric,
  humidity_min numeric,
  humidity_max numeric,
  water_avg numeric,
  water_min numeric,
  water_max numeric,
  light_avg numeric,
  light_min numeric,
  light_max numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint,
    avg(soil_moisture_percent), min(soil_moisture_percent), max(soil_moisture_percent),
    avg(air_temperature), min(air_temperature), max(air_temperature),
    avg(air_humidity), min(air_humidity), max(air_humidity),
    avg(water_raw), min(water_raw), max(water_raw),
    avg(light_raw), min(light_raw), max(light_raw)
  from public.sensor_readings s
  where s.created_at >= p_from
    and s.created_at < p_to
    and (p_device_id is null or s.device_id = p_device_id);
$$;

revoke all on function public.reading_series(text, timestamptz, timestamptz, text) from public, anon;
revoke all on function public.reading_stats(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.reading_series(text, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.reading_stats(text, timestamptz, timestamptz) to authenticated;

-- Live refresh on the dashboard.
do $$
begin
  alter publication supabase_realtime add table public.sensor_readings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
