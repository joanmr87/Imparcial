alter table if exists public.articles
  add column if not exists hero_image_url text;

create table if not exists public.site_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_type text not null,
  snapshot_date date not null,
  snapshot_slot text not null default 'default',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (snapshot_type, snapshot_date, snapshot_slot)
);

alter table public.site_snapshots enable row level security;

drop policy if exists "site_snapshots_select_public" on public.site_snapshots;
drop policy if exists "site_snapshots_insert_service" on public.site_snapshots;
drop policy if exists "site_snapshots_update_service" on public.site_snapshots;

create policy "site_snapshots_select_public" on public.site_snapshots for select using (true);
create policy "site_snapshots_insert_service" on public.site_snapshots for insert with check (true);
create policy "site_snapshots_update_service" on public.site_snapshots for update using (true);

create index if not exists site_snapshots_lookup_idx
  on public.site_snapshots(snapshot_type, snapshot_date desc, updated_at desc);
