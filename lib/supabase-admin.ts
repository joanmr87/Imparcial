import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

export async function initializeDatabase() {
  try {
    console.log("[v0] Checking if tables exist...");

    // Try to access articles table
    const { error } = await supabaseAdmin
      .from("articles")
      .select("id")
      .limit(1);

    if (error && error.code === "PGRST116") {
      console.log("[v0] Tables don't exist yet. You need to create them manually in Supabase.");
      console.log("[v0] Copy this SQL to your Supabase SQL editor:");
      console.log(`
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

        alter table public.articles enable row level security;
        alter table public.sources enable row level security;
        alter table public.facts enable row level security;

        create policy "articles_select_public" on public.articles for select using (true);
        create policy "sources_select_public" on public.sources for select using (true);
        create policy "facts_select_public" on public.facts for select using (true);

        create policy "articles_insert_service" on public.articles for insert with check (true);
        create policy "articles_update_service" on public.articles for update using (true);
        create policy "sources_insert_service" on public.sources for insert with check (true);
        create policy "facts_insert_service" on public.facts for insert with check (true);

        create index if not exists articles_slug_idx on public.articles(slug);
        create index if not exists articles_category_idx on public.articles(category);
        create index if not exists articles_published_idx on public.articles(published_at);
        create index if not exists sources_article_id_idx on public.sources(article_id);
        create index if not exists facts_article_id_idx on public.facts(article_id);
      `);
      return false;
    }

    console.log("[v0] Tables already exist!");
    return true;
  } catch (error) {
    console.error("[v0] Error checking tables:", error);
    return false;
  }
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string | null;
  featured: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  article_id: string;
  diario_name: string;
  diario_url: string | null;
  source_title: string;
  source_url: string;
  snippet: string | null;
  published_at: string | null;
  created_at: string;
}

export interface Fact {
  id: string;
  article_id: string;
  fact_text: string;
  status: "confirmed" | "developing" | "disputed";
  created_at: string;
}

export async function getArticles() {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select(
      `
      *,
      sources:sources(*),
      facts:facts(*)
    `
    )
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getArticleBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select(
      `
      *,
      sources:sources(*),
      facts:facts(*)
    `
    )
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

export async function createArticle(article: Omit<Article, "id" | "created_at" | "updated_at">, sources: Omit<Source, "id" | "created_at">[], facts: Omit<Fact, "id" | "created_at">[]) {
  // Insert article
  const { data: articleData, error: articleError } = await supabaseAdmin
    .from("articles")
    .insert([article])
    .select()
    .single();

  if (articleError) throw articleError;

  // Insert sources
  if (sources.length > 0) {
    const sourcesWithArticleId = sources.map((s) => ({
      ...s,
      article_id: articleData.id,
    }));

    const { error: sourcesError } = await supabaseAdmin
      .from("sources")
      .insert(sourcesWithArticleId);

    if (sourcesError) throw sourcesError;
  }

  // Insert facts
  if (facts.length > 0) {
    const factsWithArticleId = facts.map((f) => ({
      ...f,
      article_id: articleData.id,
    }));

    const { error: factsError } = await supabaseAdmin
      .from("facts")
      .insert(factsWithArticleId);

    if (factsError) throw factsError;
  }

  return articleData;
}
