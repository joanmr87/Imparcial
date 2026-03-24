import { createClient } from "@supabase/supabase-js"
import type { FactStatus, ImpartialArticle, SchemaStatus, Source } from "./types"

type DatabaseArticleRow = {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  category: string | null
  featured: boolean
  published_at: string
  created_at: string
  updated_at: string
  sources?: DatabaseSourceRow[]
  facts?: DatabaseFactRow[]
}

type DatabaseSourceRow = {
  id: string
  article_id: string
  diario_name: string
  diario_url: string | null
  source_title: string | null
  source_url: string
  snippet: string | null
  published_at: string | null
  created_at: string
}

type DatabaseFactRow = {
  id: string
  article_id: string
  fact_text: string
  status: FactStatus | "reported"
  created_at: string
}

const BASE_EDITORIAL_TABLES = ["articles", "sources", "facts"] as const
const PIPELINE_TABLES = [
  "ingestion_runs",
  "raw_articles",
  "raw_article_clusters",
  "generated_article_runs",
  "article_publication_events",
] as const

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

export function isTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const code = "code" in error ? String(error.code) : ""
  const message = "message" in error ? String(error.message) : ""

  return code === "PGRST205" || code === "PGRST116" || message.includes("schema cache")
}

function mapSourceRecord(source: DatabaseSourceRow): Source {
  return {
    id: source.id,
    name: source.diario_name,
    url: source.source_url,
    publishedAt: source.published_at || source.created_at,
    title: source.source_title || source.diario_name,
    snippet: source.snippet || "",
  }
}

function mapFactStatus(status: DatabaseFactRow["status"]): FactStatus {
  if (status === "reported") return "reported"
  return status
}

function mapArticleRecord(row: DatabaseArticleRow): ImpartialArticle {
  const facts = (row.facts || []).map(fact => ({
    text: fact.fact_text,
    confirmedBy: [],
    status: mapFactStatus(fact.status),
  }))

  const sources = (row.sources || []).map(mapSourceRecord)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    facts,
    discrepancies: [],
    sources,
    sourceCount: sources.length,
    articleCount: sources.length,
    category: row.category || "General",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: facts.some(fact => fact.status === "disputed")
      ? "disputed"
      : facts.some(fact => fact.status === "developing" || fact.status === "reported")
        ? "developing"
        : "confirmed",
  }
}

async function checkTables(tableNames: readonly string[]): Promise<SchemaStatus> {
  const supabaseAdmin = getAdminClient()
  const missingTables: string[] = []

  for (const tableName of tableNames) {
    const { error } = await supabaseAdmin.from(tableName).select("*").limit(1)
    if (error && isTableMissingError(error)) {
      missingTables.push(tableName)
    }
  }

  return {
    ready: missingTables.length === 0,
    checkedTables: [...tableNames],
    missingTables,
  }
}

export async function getEditorialSchemaStatus(): Promise<SchemaStatus> {
  return checkTables(BASE_EDITORIAL_TABLES)
}

export async function getPipelineSchemaStatus(): Promise<SchemaStatus> {
  return checkTables(PIPELINE_TABLES)
}

export async function getDatabaseArticles(): Promise<ImpartialArticle[]> {
  const supabaseAdmin = getAdminClient()
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select(`
      *,
      sources:sources(*),
      facts:facts(*)
    `)
    .order("published_at", { ascending: false })

  if (error) throw error

  return (data || []).map(row => mapArticleRecord(row as DatabaseArticleRow))
}

export async function getDatabaseArticleBySlug(slug: string): Promise<ImpartialArticle | null> {
  const supabaseAdmin = getAdminClient()
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select(`
      *,
      sources:sources(*),
      facts:facts(*)
    `)
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapArticleRecord(data as DatabaseArticleRow)
}

function sourceOrigin(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

function normalizeDatabaseFactStatus(status: FactStatus): "confirmed" | "developing" | "disputed" {
  if (status === "reported") return "developing"
  return status
}

export async function upsertGeneratedArticle(article: ImpartialArticle) {
  const supabaseAdmin = getAdminClient()
  const now = new Date().toISOString()

  const articlePayload = {
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    content: article.content,
    category: article.category,
    featured: false,
    published_at: article.createdAt || now,
    updated_at: now,
  }

  const { data: existingArticle, error: existingArticleError } = await supabaseAdmin
    .from("articles")
    .select("id")
    .eq("slug", article.slug)
    .maybeSingle()

  if (existingArticleError && !isTableMissingError(existingArticleError)) {
    throw existingArticleError
  }

  let articleId = existingArticle?.id as string | undefined

  if (articleId) {
    const { error } = await supabaseAdmin.from("articles").update(articlePayload).eq("id", articleId)
    if (error) throw error

    await supabaseAdmin.from("sources").delete().eq("article_id", articleId)
    await supabaseAdmin.from("facts").delete().eq("article_id", articleId)
  } else {
    const { data, error } = await supabaseAdmin
      .from("articles")
      .insert(articlePayload)
      .select("id")
      .single()

    if (error) throw error
    articleId = data.id
  }

  if (!articleId) {
    throw new Error("Failed to resolve article id after upsert")
  }

  const sourcesPayload = article.sources.map(source => ({
    article_id: articleId,
    diario_name: source.name,
    diario_url: sourceOrigin(source.url),
    source_title: source.title,
    source_url: source.url,
    snippet: source.snippet,
    published_at: source.publishedAt,
  }))

  const factsPayload = article.facts.map(fact => ({
    article_id: articleId,
    fact_text: fact.text,
    status: normalizeDatabaseFactStatus(fact.status),
  }))

  if (sourcesPayload.length > 0) {
    const { error } = await supabaseAdmin.from("sources").insert(sourcesPayload)
    if (error) throw error
  }

  if (factsPayload.length > 0) {
    const { error } = await supabaseAdmin.from("facts").insert(factsPayload)
    if (error) throw error
  }

  return articleId
}
