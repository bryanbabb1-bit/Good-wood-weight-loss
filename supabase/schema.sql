-- Good Wood Weight Loss Challenge: Supabase schema.
-- Paste this whole file into Supabase > SQL Editor > New query, then Run.
-- Safe to re-run. Tables are locked down (RLS on, no policies); the app only
-- talks to the database through the functions below, which check the
-- person's PIN or the commissioner passcode on every call.

create extension if not exists pgcrypto;

create table if not exists gw_participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  track text not null default 'lose' check (track in ('lose', 'gain')),
  active boolean not null default true,
  pin_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists gw_participants_name_key on gw_participants (lower(name));

create table if not exists gw_weighins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references gw_participants (id) on delete cascade,
  week int not null check (week >= 0),
  weight numeric(6, 1) not null check (weight between 50 and 700),
  at timestamptz not null default now(),
  unique (user_id, week)
);

create table if not exists gw_shouts (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references gw_participants (id) on delete cascade,
  to_id uuid references gw_participants (id) on delete set null,
  text text not null check (char_length(text) between 1 and 280),
  at timestamptz not null default now(),
  reactions jsonb not null default '{}'::jsonb
);

create table if not exists gw_settings (key text primary key, value text);

alter table gw_participants enable row level security;
alter table gw_weighins enable row level security;
alter table gw_shouts enable row level security;
alter table gw_settings enable row level security;
revoke all on gw_participants, gw_weighins, gw_shouts, gw_settings from anon, authenticated;

-- ---------- internal helpers (not callable by the app) ----------
create or replace function gw_auth(p_uid uuid, p_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gw_participants where id = p_uid and pin_hash = p_hash and active);
$$;

create or replace function gw_admin_ok(p_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gw_settings where key = 'admin_hash' and value = p_hash);
$$;

create or replace function gw_snapshot() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'users', coalesce((select json_agg(json_build_object('id', id, 'name', name, 'track', track, 'active', active) order by created_at) from gw_participants), '[]'),
    'weighins', coalesce((select json_agg(json_build_object('id', id, 'userId', user_id, 'week', week, 'weight', weight, 'at', at)) from gw_weighins), '[]'),
    'shouts', coalesce((select json_agg(json_build_object('id', id, 'fromId', from_id, 'toId', to_id, 'text', text, 'at', at, 'reactions', reactions)) from gw_shouts), '[]')
  );
$$;

revoke all on function gw_auth(uuid, text), gw_admin_ok(text), gw_snapshot() from public, anon, authenticated;

-- ---------- participant functions ----------
create or replace function gw_login(p_name text, p_hash text) returns json
language plpgsql security definer set search_path = public as $$
declare r json;
begin
  select json_build_object('id', id, 'name', name, 'track', track, 'active', active) into r
  from gw_participants where lower(name) = lower(trim(p_name)) and pin_hash = p_hash and active;
  if r is null then raise exception 'Name or PIN didn''t match'; end if;
  return r;
end $$;

create or replace function gw_data(p_uid uuid, p_hash text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not gw_auth(p_uid, p_hash) then raise exception 'Please log in again'; end if;
  return gw_snapshot();
end $$;

create or replace function gw_weighin(p_uid uuid, p_hash text, p_week int, p_weight numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not gw_auth(p_uid, p_hash) then raise exception 'Please log in again'; end if;
  insert into gw_weighins (user_id, week, weight) values (p_uid, p_week, p_weight)
  on conflict (user_id, week) do update set weight = excluded.weight, at = now();
end $$;

create or replace function gw_set_pin(p_uid uuid, p_hash text, p_new text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not gw_auth(p_uid, p_hash) then raise exception 'Please log in again'; end if;
  update gw_participants set pin_hash = p_new where id = p_uid;
end $$;

create or replace function gw_shout(p_uid uuid, p_hash text, p_to uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not gw_auth(p_uid, p_hash) then raise exception 'Please log in again'; end if;
  insert into gw_shouts (from_id, to_id, text) values (p_uid, p_to, trim(p_text));
end $$;

create or replace function gw_react(p_uid uuid, p_hash text, p_shout uuid, p_emoji text) returns void
language plpgsql security definer set search_path = public as $$
declare r jsonb; lst jsonb;
begin
  if not gw_auth(p_uid, p_hash) then raise exception 'Please log in again'; end if;
  if p_emoji not in ('👏', '🔥', '💪', '😂') then raise exception 'Unknown reaction'; end if;
  select reactions into r from gw_shouts where id = p_shout for update;
  if r is null then return; end if;
  lst := coalesce(r -> p_emoji, '[]'::jsonb);
  if lst ? p_uid::text then lst := lst - p_uid::text; else lst := lst || to_jsonb(p_uid::text); end if;
  update gw_shouts set reactions = jsonb_set(r, array[p_emoji], lst) where id = p_shout;
end $$;

-- ---------- commissioner functions ----------
create or replace function gw_admin_has() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gw_settings where key = 'admin_hash');
$$;

create or replace function gw_admin_set(p_new text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from gw_settings where key = 'admin_hash') then raise exception 'Passcode already set'; end if;
  insert into gw_settings (key, value) values ('admin_hash', p_new);
end $$;

create or replace function gw_admin(p_hash text, p_action text, p_args jsonb default '{}'::jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare r json;
begin
  if not gw_admin_ok(p_hash) then raise exception 'Wrong passcode'; end if;
  case p_action
  when 'check' then return 'true'::json;
  when 'data' then return gw_snapshot();
  when 'add_user' then
    begin
      insert into gw_participants (name, track, pin_hash)
      values (trim(p_args ->> 'name'), coalesce(p_args ->> 'track', 'lose'), p_args ->> 'pinHash')
      returning json_build_object('id', id, 'name', name, 'track', track, 'active', active) into r;
    exception when unique_violation then raise exception 'That name is taken';
    end;
    return r;
  when 'update_user' then
    update gw_participants set
      name = coalesce(p_args ->> 'name', name),
      track = coalesce(p_args ->> 'track', track),
      active = coalesce((p_args ->> 'active')::boolean, active),
      pin_hash = coalesce(p_args ->> 'pinHash', pin_hash)
    where id = (p_args ->> 'id')::uuid;
  when 'upsert_weighin' then
    insert into gw_weighins (user_id, week, weight)
    values ((p_args ->> 'userId')::uuid, (p_args ->> 'week')::int, (p_args ->> 'weight')::numeric)
    on conflict (user_id, week) do update set weight = excluded.weight, at = now();
  when 'delete_weighin' then delete from gw_weighins where id = (p_args ->> 'id')::uuid;
  when 'delete_shout' then delete from gw_shouts where id = (p_args ->> 'id')::uuid;
  when 'export' then
    return json_build_object(
      'users', coalesce((select json_agg(json_build_object('id', id, 'name', name, 'track', track, 'active', active, 'pinHash', pin_hash) order by created_at) from gw_participants), '[]'),
      'weighins', (gw_snapshot() -> 'weighins'), 'shouts', (gw_snapshot() -> 'shouts'));
  when 'import' then
    delete from gw_shouts; delete from gw_weighins; delete from gw_participants;
    insert into gw_participants (id, name, track, active, pin_hash)
      select (u ->> 'id')::uuid, u ->> 'name', u ->> 'track', coalesce((u ->> 'active')::boolean, true), u ->> 'pinHash'
      from jsonb_array_elements(p_args -> 'users') u;
    insert into gw_weighins (id, user_id, week, weight, at)
      select (w ->> 'id')::uuid, (w ->> 'userId')::uuid, (w ->> 'week')::int, (w ->> 'weight')::numeric, coalesce((w ->> 'at')::timestamptz, now())
      from jsonb_array_elements(coalesce(p_args -> 'weighins', '[]')) w;
    insert into gw_shouts (id, from_id, to_id, text, at, reactions)
      select (s ->> 'id')::uuid, (s ->> 'fromId')::uuid, nullif(s ->> 'toId', '')::uuid, s ->> 'text', coalesce((s ->> 'at')::timestamptz, now()), coalesce(s -> 'reactions', '{}')
      from jsonb_array_elements(coalesce(p_args -> 'shouts', '[]')) s;
  else raise exception 'Unknown action %', p_action;
  end case;
  return null;
end $$;

grant execute on function gw_login(text, text), gw_data(uuid, text), gw_weighin(uuid, text, int, numeric),
  gw_set_pin(uuid, text, text), gw_shout(uuid, text, uuid, text), gw_react(uuid, text, uuid, text),
  gw_admin_has(), gw_admin_set(text), gw_admin(text, text, jsonb) to anon, authenticated;
