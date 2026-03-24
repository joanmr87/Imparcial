import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Missing Supabase credentials" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  try {
    console.log("[v0] Creating articles table...");
    const { error: articlesError } = await supabase.from("articles").select().limit(0);
    
    if (articlesError && articlesError.message.includes("relation") ) {
      // Table doesn't exist, create it
      const sql = `
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
      `;

      const statements = sql.split(";").filter((s) => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          // Use raw SQL through the admin API
          const { data, error } = await (supabase as any).rpc("execute_sql", {
            sql: statement,
          });

          if (error) {
            console.log(`[v0] Skipping statement (might already exist): ${error.message}`);
          }
        }
      }
    }

    console.log("[v0] Tables ready!");
    return Response.json({
      success: true,
      message: "Database schema initialized",
    });
  } catch (error) {
    console.error("[v0] Migration error:", error);
    return Response.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
