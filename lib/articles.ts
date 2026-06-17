import { unstable_cache } from "next/cache"
import { isArticleCoherent } from "./article-dedup"
import { generateImpartialArticle } from "./editorial"
import { inferCategoryFromArticle } from "./news-categories"
import { clusterNews, fetchAllFeeds } from "./rss-fetcher"
import { safeGetLatestSiteSnapshot } from "./site-snapshots"
import { getDatabaseArticleBySlug, getDatabaseArticles, isTableMissingError } from "./supabase-admin"
import type { ImpartialArticle, NewsCluster } from "./types"

const FRESH_SIGNAL_WINDOW_HOURS = 36
const RECENT_SIGNAL_WINDOW_HOURS = 72
const MIN_HOMEPAGE_ARTICLES = 16
const MIN_HOMEPAGE_CATEGORIES = 4
const LIVE_FALLBACK_LIMIT = 12
const LIVE_FALLBACK_SOURCE_IDS = ["lanacion", "tn", "ambito", "c5n", "infobae"]
const PUBLISHED_ARTICLE_SNAPSHOT_TYPE = "published-article"
const volatilePublishedArticleArchive = new Map<string, ImpartialArticle>()
const ARTICLE_SLUG_FINGERPRINT_PATTERN = /-([a-f0-9]{8})$/i

function dedupeArticles(articles: ImpartialArticle[]): ImpartialArticle[] {
  const seen = new Set<string>()

  return articles.filter(article => {
    const key = article.slug || article.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractSlugFingerprint(slug?: string | null): string | null {
  if (!slug) return null
  const match = slug.match(ARTICLE_SLUG_FINGERPRINT_PATTERN)
  return match?.[1]?.toLowerCase() || null
}

function articleMatchesRequestedSlug(article: ImpartialArticle, requestedSlug: string): boolean {
  if (article.slug === requestedSlug) return true

  const requestedFingerprint = extractSlugFingerprint(requestedSlug)
  if (!requestedFingerprint) return false

  return extractSlugFingerprint(article.slug) === requestedFingerprint
}

function findArticleByRequestedSlug(articles: ImpartialArticle[], requestedSlug: string): ImpartialArticle | null {
  return articles.find(article => articleMatchesRequestedSlug(article, requestedSlug)) || null
}

function distinctCategories(articles: ImpartialArticle[]): number {
  return new Set(articles.map(article => inferCategoryFromArticle(article))).size
}

function articleSignalTimestamp(article: ImpartialArticle): string {
  const sourceTimes = article.sources
    .map(source => new Date(source.publishedAt).getTime())
    .filter(timestamp => Number.isFinite(timestamp))

  if (sourceTimes.length > 0) {
    return new Date(Math.max(...sourceTimes)).toISOString()
  }

  return article.updatedAt || article.createdAt
}

function hoursSince(timestamp: string): number {
  const date = new Date(timestamp).getTime()
  if (Number.isNaN(date)) return RECENT_SIGNAL_WINDOW_HOURS
  return Math.max(0, (Date.now() - date) / (1000 * 60 * 60))
}

function articleEditorialScore(article: ImpartialArticle): number {
  const confirmedFacts = article.facts.filter(fact => fact.status === "confirmed").length
  const developingFacts = article.facts.filter(fact => fact.status === "developing" || fact.status === "reported").length
  const freshnessHours = hoursSince(articleSignalTimestamp(article))
  const freshnessBoost = Math.max(0, 48 - freshnessHours) * 0.75
  const stalePenalty = Math.max(0, freshnessHours - RECENT_SIGNAL_WINDOW_HOURS) * 2
  const statusBoost = article.status === "confirmed" ? 8 : article.status === "developing" ? 5 : 3

  return article.sourceCount * 9
    + article.articleCount * 2
    + confirmedFacts * 2.5
    + developingFacts
    + freshnessBoost
    + statusBoost
    - stalePenalty
}

function sortPublishedArticles(articles: ImpartialArticle[]): ImpartialArticle[] {
  return [...articles].sort((left, right) => {
    const scoreDifference = articleEditorialScore(right) - articleEditorialScore(left)
    if (scoreDifference !== 0) return scoreDifference
    return new Date(articleSignalTimestamp(right)).getTime() - new Date(articleSignalTimestamp(left)).getTime()
  })
}

function selectPublishedDatabaseArticles(articles: ImpartialArticle[]): {
  fresh: ImpartialArticle[]
  stale: ImpartialArticle[]
} {
  const coherentArticles = dedupeArticles(articles.filter(isArticleCoherent))
  const sortedArticles = sortPublishedArticles(coherentArticles)

  return {
    fresh: sortedArticles.filter(article => hoursSince(articleSignalTimestamp(article)) <= RECENT_SIGNAL_WINDOW_HOURS),
    stale: sortedArticles.filter(article => hoursSince(articleSignalTimestamp(article)) > RECENT_SIGNAL_WINDOW_HOURS),
  }
}

function isMissingIncrementalCacheError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("incrementalCache missing")
}

function rememberPublishedArticles(articles: ImpartialArticle[]) {
  for (const article of articles) {
    if (!article.slug) continue
    volatilePublishedArticleArchive.set(article.slug, article)
  }
}

function clusterFreshnessHours(cluster: NewsCluster): number {
  const date = new Date(cluster.lastPublishedAt).getTime()
  if (Number.isNaN(date)) return RECENT_SIGNAL_WINDOW_HOURS
  return Math.max(0, (Date.now() - date) / (1000 * 60 * 60))
}

function liveFallbackClusterScore(cluster: NewsCluster): number {
  const freshnessBoost = Math.max(0, FRESH_SIGNAL_WINDOW_HOURS - clusterFreshnessHours(cluster))
  return cluster.sourcesCount * 12 + Math.min(cluster.articles.length, 6) * 2 + freshnessBoost
}

async function buildLiveFallbackArticles(): Promise<ImpartialArticle[]> {
  const feedResults = await fetchAllFeeds(LIVE_FALLBACK_SOURCE_IDS)
  const clusters = clusterNews(feedResults.flatMap(result => result.items))
    .filter(cluster => cluster.sourcesCount >= 2)
    .filter(cluster => clusterFreshnessHours(cluster) <= FRESH_SIGNAL_WINDOW_HOURS)
    .sort((left, right) => {
      const scoreDifference = liveFallbackClusterScore(right) - liveFallbackClusterScore(left)
      if (scoreDifference !== 0) return scoreDifference
      return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime()
    })
    .slice(0, LIVE_FALLBACK_LIMIT)

  const articles = await Promise.all(
    clusters.map(async cluster => {
      const { article } = await generateImpartialArticle(cluster.topic, cluster.articles, { useAi: false })
      return article
    })
  )

  rememberPublishedArticles(articles)
  return articles.filter(isArticleCoherent)
}

const getCachedLiveFallbackArticles = unstable_cache(
  buildLiveFallbackArticles,
  ["live-fallback-articles-v2"],
  { revalidate: 600 }
)

async function readPublishedArticles(): Promise<{
  articles: ImpartialArticle[]
  source: "database" | "generated" | "empty"
  warning?: string
}> {
  try {
    const { fresh: freshDatabaseArticles } = selectPublishedDatabaseArticles(await getDatabaseArticles())
    const freshestDatabaseHours = freshDatabaseArticles[0]
      ? hoursSince(articleSignalTimestamp(freshDatabaseArticles[0]))
      : Number.POSITIVE_INFINITY
    const needsEditorialSupport =
      freshDatabaseArticles.length < MIN_HOMEPAGE_ARTICLES ||
      distinctCategories(freshDatabaseArticles) < MIN_HOMEPAGE_CATEGORIES ||
      freshestDatabaseHours > FRESH_SIGNAL_WINDOW_HOURS

    if (!needsEditorialSupport && freshDatabaseArticles.length > 0) {
      rememberPublishedArticles(freshDatabaseArticles)
      return {
        articles: freshDatabaseArticles,
        source: "database",
      }
    }

    if (freshDatabaseArticles.length > 0) {
      rememberPublishedArticles(freshDatabaseArticles)
      return {
        articles: freshDatabaseArticles,
        source: "database",
        warning: needsEditorialSupport
          ? "La edición actual todavía no tiene suficiente volumen fresco, por eso se muestra solo lo publicado recientemente."
          : undefined,
      }
    }

    const liveFallbackArticles = await getCachedLiveFallbackArticles()
    if (liveFallbackArticles.length > 0) {
      return {
        articles: liveFallbackArticles,
        source: "generated",
        warning: "La base publicada todavía no tiene una edición fresca, por eso se muestra una edición temporal construida desde RSS actuales.",
      }
    }

    return {
      articles: [],
      source: "empty",
      warning: "Todavía no hay síntesis suficientes construidas desde varias coberturas para abrir una edición completa.",
    }
  } catch (error) {
    try {
      const liveFallbackArticles = await getCachedLiveFallbackArticles()
      if (liveFallbackArticles.length > 0) {
        return {
          articles: liveFallbackArticles,
          source: "generated",
          warning: "La base editorial no respondió y se muestra una edición temporal construida desde RSS actuales.",
        }
      }
    } catch {
      // Fall through to empty state below.
    }

    return {
      articles: [],
      source: "empty",
      warning: isTableMissingError(error)
        ? "La base editorial todavía no está lista para publicar síntesis desde varias fuentes."
        : `La base editorial no está disponible: ${(error as Error).message}`,
    }
  }
}

const getCachedPublishedArticles = unstable_cache(
  readPublishedArticles,
  ["published-articles-v2"],
  { revalidate: 900 }
)

export async function listPublishedArticles(): Promise<{
  articles: ImpartialArticle[]
  source: "database" | "generated" | "empty"
  warning?: string
}> {
  try {
    return await getCachedPublishedArticles()
  } catch (error) {
    if (isMissingIncrementalCacheError(error)) {
      return readPublishedArticles()
    }

    throw error
  }
}

export async function findPublishedArticleBySlug(slug: string): Promise<{
  article: ImpartialArticle | null
  source: "database" | "generated" | "empty"
}> {
  try {
    const published = await listPublishedArticles()
    const publishedArticle = findArticleByRequestedSlug(published.articles, slug)
    if (publishedArticle) {
      rememberPublishedArticles([publishedArticle])
      return { article: publishedArticle, source: published.source }
    }
  } catch {
    // Fall through to generated content.
  }

  const archivedArticle = volatilePublishedArticleArchive.get(slug)
    || findArticleByRequestedSlug([...volatilePublishedArticleArchive.values()], slug)
  if (archivedArticle) {
    return { article: archivedArticle, source: "generated" }
  }

  try {
    const storedSnapshot = await safeGetLatestSiteSnapshot<ImpartialArticle>(
      PUBLISHED_ARTICLE_SNAPSHOT_TYPE,
      slug
    )
    if (storedSnapshot?.payload && isArticleCoherent(storedSnapshot.payload)) {
      rememberPublishedArticles([storedSnapshot.payload])
      return { article: storedSnapshot.payload, source: "generated" }
    }
  } catch {
    // Fall through to database lookup.
  }

  try {
    const article = await getDatabaseArticleBySlug(slug)
    if (article && isArticleCoherent(article)) {
      rememberPublishedArticles([article])
      return { article, source: "database" }
    }
  } catch {
    // Fall through to generated content.
  }

  try {
    const databaseArticles = (await getDatabaseArticles()).filter(isArticleCoherent)
    const matchedDatabaseArticle = findArticleByRequestedSlug(databaseArticles, slug)
    if (matchedDatabaseArticle) {
      rememberPublishedArticles([matchedDatabaseArticle])
      return { article: matchedDatabaseArticle, source: "database" }
    }
  } catch {
    // Fall through to generated content.
  }

  return { article: null, source: "empty" }
}
