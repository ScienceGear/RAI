create extension if not exists pgcrypto;

alter table if exists profiles
  add column if not exists permissions_complete boolean not null default false,
  add column if not exists usage_access_granted boolean not null default false,
  add column if not exists battery_exempt boolean not null default false,
  add column if not exists danger_hours int[] not null default '{}';

create table if not exists screen_time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null,
  hour_bucket int not null check (hour_bucket >= 0 and hour_bucket <= 23),
  package_name text not null,
  total_time_ms bigint not null default 0,
  distraction_minutes int not null default 0,
  productive_minutes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_at, package_name)
);

create index if not exists idx_screen_time_logs_user_time on screen_time_logs (user_id, logged_at desc);

alter table screen_time_logs enable row level security;

drop policy if exists "screen_time_logs_owner_select" on screen_time_logs;
create policy "screen_time_logs_owner_select"
on screen_time_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "screen_time_logs_owner_insert" on screen_time_logs;
create policy "screen_time_logs_owner_insert"
on screen_time_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "screen_time_logs_owner_update" on screen_time_logs;
create policy "screen_time_logs_owner_update"
on screen_time_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update on table screen_time_logs to authenticated;

