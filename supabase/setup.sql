-- Run in the SQL Editor of the intended Crew Health Supabase project.
-- This creates an account-scoped ground-packet archive for synthetic demos.
create table if not exists public.crew_health_packets (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id),
  run_id uuid not null,
  report jsonb not null,
  created_at timestamptz not null default now(),
  constraint synthetic_packets_only check (report @> '{"synthetic": true}'::jsonb)
);
alter table public.crew_health_packets enable row level security;
revoke all on public.crew_health_packets from anon;
grant select, insert on public.crew_health_packets to authenticated;
drop policy if exists crew_packets_read_own on public.crew_health_packets;
create policy crew_packets_read_own on public.crew_health_packets
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists crew_packets_insert_own on public.crew_health_packets;
create policy crew_packets_insert_own on public.crew_health_packets
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create index if not exists crew_packets_owner_created
  on public.crew_health_packets (owner_id, created_at desc);
