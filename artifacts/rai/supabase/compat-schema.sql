create extension if not exists "uuid-ossp";

-- If your project uses table-level Data API exposure, also expose:
-- public.user_data, public.squads, public.invite_codes in Dashboard.

create table if not exists user_data (
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists squads (
  id text primary key,
  name text not null,
  invite_code text not null unique,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  members jsonb not null default '[]'::jsonb
);

create table if not exists invite_codes (
  code text primary key,
  squad_id text not null references squads(id) on delete cascade
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_data'
  ) then
    alter publication supabase_realtime add table user_data;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'squads'
  ) then
    alter publication supabase_realtime add table squads;
  end if;
end $$;

alter table user_data enable row level security;
alter table squads enable row level security;
alter table invite_codes enable row level security;

drop policy if exists "user_data_owner_all" on user_data;
create policy "user_data_owner_all"
on user_data
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "invite_codes_read_authenticated" on invite_codes;
create policy "invite_codes_read_authenticated"
on invite_codes
for select
to authenticated
using (true);

drop policy if exists "invite_codes_write_authenticated" on invite_codes;
create policy "invite_codes_write_authenticated"
on invite_codes
for insert
to authenticated
with check (true);

drop policy if exists "squads_read_authenticated" on squads;
create policy "squads_read_authenticated"
on squads
for select
to authenticated
using (true);

drop policy if exists "squads_write_authenticated" on squads;
create policy "squads_write_authenticated"
on squads
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "squads_update_authenticated" on squads;
create policy "squads_update_authenticated"
on squads
for update
to authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table user_data to authenticated;
grant select, insert, update on table squads to authenticated;
grant select, insert on table invite_codes to authenticated;
