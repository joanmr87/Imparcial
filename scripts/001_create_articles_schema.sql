-- Create articles table for Diario Imparcial
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  content text not null,
  category text,
  featured boolean default false,
  published_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create sources table to track which diarios published on this topic
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

-- Create facts table for structured fact-checking
create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  fact_text text not null,
  status text not null default 'confirmed', -- 'confirmed', 'developing', 'disputed'
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.articles enable row level security;
alter table public.sources enable row level security;
alter table public.facts enable row level security;

-- RLS Policies - Allow public read access
create policy "articles_select_public" on public.articles for select using (true);
create policy "sources_select_public" on public.sources for select using (true);
create policy "facts_select_public" on public.facts for select using (true);

-- Allow service role to insert/update/delete (for backend processing)
create policy "articles_insert_service" on public.articles for insert with check (true);
create policy "articles_update_service" on public.articles for update using (true);
create policy "sources_insert_service" on public.sources for insert with check (true);
create policy "facts_insert_service" on public.facts for insert with check (true);

-- Create indexes
create index if not exists articles_slug_idx on public.articles(slug);
create index if not exists articles_category_idx on public.articles(category);
create index if not exists articles_published_idx on public.articles(published_at);
create index if not exists sources_article_id_idx on public.sources(article_id);
create index if not exists facts_article_id_idx on public.facts(article_id);
