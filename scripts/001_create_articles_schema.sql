create extension if not exists pgcrypto;

-- Public editorial tables used by the site
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  content text not null,
  hero_image_url text,
  category text,
  featured boolean default false,
  published_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  diario_name text not null,
  diario_url text,
  source_title text,
  source_url text not null,
  snippet text,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  fact_text text not null,
  status text not null default 'confirmed',
  created_at timestamp with time zone default now()
);

-- Internal ingestion and generation pipeline
create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null default 'manual',
  status text not null default 'running',
  requested_sources text[] not null default '{}',
  feeds_ok integer not null default 0,
  feeds_failed integer not null default 0,
  started_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  notes jsonb not null default '{}'::jsonb
);

create table if not exists public.raw_articles (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid references public.ingestion_runs(id) on delete set null,
  source_id text not null,
  source_name text not null,
  source_url text not null,
  rss_title text not null,
  rss_description text,
  canonical_url text not null unique,
  published_at timestamp with time zone,
  content_hash text,
  created_at timestamp with time zone default now()
);

create table if not exists public.raw_article_clusters (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid references public.ingestion_runs(id) on delete set null,
  topic text not null,
  keyword_signature text[] not null default '{}',
  sources_count integer not null default 0,
  first_published_at timestamp with time zone,
  last_published_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.raw_article_cluster_items (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.raw_article_clusters(id) on delete cascade,
  raw_article_id uuid not null references public.raw_articles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (cluster_id, raw_article_id)
);

create table if not exists public.generated_article_runs (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.raw_article_clusters(id) on delete set null,
  article_id uuid references public.articles(id) on delete set null,
  model text not null,
  prompt_version text not null default 'v1',
  status text not null default 'generated',
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  created_at timestamp with time zone default now()
);

create table if not exists public.article_publication_events (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  event_type text not null default 'generated',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

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

alter table public.articles enable row level security;
alter table public.sources enable row level security;
alter table public.facts enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.raw_articles enable row level security;
alter table public.raw_article_clusters enable row level security;
alter table public.raw_article_cluster_items enable row level security;
alter table public.generated_article_runs enable row level security;
alter table public.article_publication_events enable row level security;
alter table public.site_snapshots enable row level security;

-- Public read access for published editorial content
drop policy if exists "articles_select_public" on public.articles;
drop policy if exists "sources_select_public" on public.sources;
drop policy if exists "facts_select_public" on public.facts;
create policy "articles_select_public" on public.articles for select using (true);
create policy "sources_select_public" on public.sources for select using (true);
create policy "facts_select_public" on public.facts for select using (true);

-- Service writes and maintenance
drop policy if exists "articles_insert_service" on public.articles;
drop policy if exists "articles_update_service" on public.articles;
drop policy if exists "articles_delete_service" on public.articles;
drop policy if exists "sources_insert_service" on public.sources;
drop policy if exists "sources_delete_service" on public.sources;
drop policy if exists "facts_insert_service" on public.facts;
drop policy if exists "facts_delete_service" on public.facts;
drop policy if exists "site_snapshots_select_public" on public.site_snapshots;
drop policy if exists "site_snapshots_insert_service" on public.site_snapshots;
drop policy if exists "site_snapshots_update_service" on public.site_snapshots;

create policy "articles_insert_service" on public.articles for insert with check (true);
create policy "articles_update_service" on public.articles for update using (true);
create policy "articles_delete_service" on public.articles for delete using (true);
create policy "sources_insert_service" on public.sources for insert with check (true);
create policy "sources_delete_service" on public.sources for delete using (true);
create policy "facts_insert_service" on public.facts for insert with check (true);
create policy "facts_delete_service" on public.facts for delete using (true);
create policy "site_snapshots_select_public" on public.site_snapshots for select using (true);
create policy "site_snapshots_insert_service" on public.site_snapshots for insert with check (true);
create policy "site_snapshots_update_service" on public.site_snapshots for update using (true);

create index if not exists articles_slug_idx on public.articles(slug);
create index if not exists articles_category_idx on public.articles(category);
create index if not exists articles_published_idx on public.articles(published_at desc);
create index if not exists sources_article_id_idx on public.sources(article_id);
create index if not exists facts_article_id_idx on public.facts(article_id);
create index if not exists ingestion_runs_status_idx on public.ingestion_runs(status, started_at desc);
create index if not exists raw_articles_source_idx on public.raw_articles(source_id, published_at desc);
create index if not exists raw_articles_hash_idx on public.raw_articles(content_hash);
create index if not exists raw_clusters_sources_idx on public.raw_article_clusters(sources_count desc, last_published_at desc);
create index if not exists generated_runs_article_idx on public.generated_article_runs(article_id, created_at desc);
create index if not exists publication_events_article_idx on public.article_publication_events(article_id, created_at desc);
create index if not exists site_snapshots_lookup_idx on public.site_snapshots(snapshot_type, snapshot_date desc, updated_at desc);
