import { isArticleCoherent } from "./article-dedup"
import { getGeneratedEditorialStock } from "./editorial-stock"
import { inferCategoryFromArticle } from "./news-categories"
import { getDatabaseArticleBySlug, getDatabaseArticles, isTableMissingError } from "./supabase-admin"
import type { ImpartialArticle } from "./types"

const FRESH_SIGNAL_WINDOW_HOURS = 36
const RECENT_SIGNAL_WINDOW_HOURS = 72
const MIN_HOMEPAGE_ARTICLES = 12
const MIN_HOMEPAGE_CATEGORIES = 4
const MAX_STALE_DATABASE_FILL = 4

function dedupeArticles(articles: ImpartialArticle[]): ImpartialArticle[] {
  const seen = new Set<string>()

  return articles.filter(article => {
    const key = article.slug || article.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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

function mergePublishedArticles(
  leadingArticles: ImpartialArticle[],
  trailingArticles: ImpartialArticle[],
  limit = 18
): ImpartialArticle[] {
  return sortPublishedArticles(dedupeArticles([...leadingArticles, ...trailingArticles])).slice(0, limit)
}

export async function listPublishedArticles(): Promise<{
  articles: ImpartialArticle[]
  source: "database" | "generated" | "empty"
  warning?: string
}> {
  try {
    const { fresh: freshDatabaseArticles, stale: staleDatabaseArticles } = selectPublishedDatabaseArticles(await getDatabaseArticles())
    const freshestDatabaseHours = freshDatabaseArticles[0]
      ? hoursSince(articleSignalTimestamp(freshDatabaseArticles[0]))
      : Number.POSITIVE_INFINITY
    const needsEditorialSupport =
      freshDatabaseArticles.length < MIN_HOMEPAGE_ARTICLES ||
      distinctCategories(freshDatabaseArticles) < MIN_HOMEPAGE_CATEGORIES ||
      freshestDatabaseHours > FRESH_SIGNAL_WINDOW_HOURS

    if (!needsEditorialSupport && freshDatabaseArticles.length > 0) {
      return {
        articles: freshDatabaseArticles,
        source: "database",
      }
    }

    const generatedArticles = (await getGeneratedEditorialStock()).filter(isArticleCoherent)
    const leadingArticles = generatedArticles.length > 0
      ? generatedArticles
      : freshDatabaseArticles
    let mergedArticles = mergePublishedArticles(leadingArticles, freshDatabaseArticles)

    if (mergedArticles.length < MIN_HOMEPAGE_ARTICLES) {
      mergedArticles = mergePublishedArticles(mergedArticles, staleDatabaseArticles.slice(0, MAX_STALE_DATABASE_FILL))
    }

    if (mergedArticles.length > 0) {
      return {
        articles: mergedArticles,
        source: freshDatabaseArticles.length > 0 ? "database" : "generated",
        warning: "La portada prioriza temas frescos del día. Si la edición persistida queda corta, se completa con una selección de respaldo construida desde coberturas recientes de varios medios.",
      }
    }

    if (staleDatabaseArticles.length > 0) {
      return {
        articles: staleDatabaseArticles.slice(0, MAX_STALE_DATABASE_FILL),
        source: "database",
        warning: "No entró todavía una edición fresca suficiente y por eso se muestra una selección limitada de la última edición sólida disponible.",
      }
    }

    return {
      articles: [],
      source: "empty",
      warning: "Todavía no hay síntesis suficientes construidas desde varias coberturas para abrir una edición completa.",
    }
  } catch (error) {
    try {
      const generatedArticles = (await getGeneratedEditorialStock()).filter(isArticleCoherent)
      if (generatedArticles.length > 0) {
        return {
          articles: sortPublishedArticles(generatedArticles),
          source: "generated",
          warning: "La edición persistida no está disponible y se muestra una selección de respaldo construida desde varias coberturas.",
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

export async function findPublishedArticleBySlug(slug: string): Promise<{
  article: ImpartialArticle | null
  source: "database" | "generated" | "empty"
}> {
  try {
    const article = await getDatabaseArticleBySlug(slug)
    if (article && isArticleCoherent(article)) return { article, source: "database" }
  } catch {
    // Fall through to generated content.
  }

  try {
    const generatedArticles = await getGeneratedEditorialStock()
    const generatedArticle = generatedArticles
      .filter(isArticleCoherent)
      .find(article => article.slug === slug)
    if (generatedArticle) {
      return { article: generatedArticle, source: "generated" }
    }
  } catch {
    // Fall through to empty content.
  }

  return { article: null, source: "empty" }
}
