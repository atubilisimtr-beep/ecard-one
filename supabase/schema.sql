-- Core tables for Ecard production setup.
create extension if not exists pgcrypto;

create type app_role as enum ('creator', 'admin', 'super_admin', 'agency');

--create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  category text not null default 'Creator',
  bio text not null default '',
  theme text not null default 'dark',
  role app_role not null default 'creator',
  pro_enabled boolean not null default false,
  custom_domain text,
  media_kit_url text,
  sponsor_title text,
  sponsor_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  url text not null,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  platform text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  session_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  profile_id uuid,
  actor_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.social_links enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "Public profile read" on public.profiles
for select using (true);

create policy "Owner manage profile" on public.profiles
for all using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Public link read" on public.social_links
for select using (true);

create policy "Owner manage links" on public.social_links
for all using (
  exists (select 1 from public.profiles p where p.id = social_links.profile_id and p.id = auth.uid())
)
with check (
  exists (select 1 from public.profiles p where p.id = social_links.profile_id and p.id = auth.uid())
);

create policy "Insert analytics" on public.analytics_events
for insert with check (true);

create policy "Owner read analytics" on public.analytics_events
for select using (
  exists (select 1 from public.profiles p where p.id = analytics_events.profile_id and p.id = auth.uid())
);

create policy "Owner read audit" on public.audit_logs
for select using (
  actor_id = auth.uid() or profile_id = auth.uid()
);
