import { isArticleCoherent } from "./article-dedup"
import { getGeneratedEditorialStock } from "./editorial-stock"
import { inferCategoryFromArticle } from "./news-categories"
import { getDatabaseArticleBySlug, getDatabaseArticles, isTableMissingError } from "./supabase-admin"
import type { ImpartialArticle } from "./types"

const PREFERRED_WINDOW_HOURS = 72

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

function hoursSince(timestamp: string): number {
  const date = new Date(timestamp).getTime()
  if (Number.isNaN(date)) return PREFERRED_WINDOW_HOURS
  return Math.max(0, (Date.now() - date) / (1000 * 60 * 60))
}

function articleEditorialScore(article: ImpartialArticle): number {
  const confirmedFacts = article.facts.filter(fact => fact.status === "confirmed").length
  const developingFacts = article.facts.filter(fact => fact.status === "developing" || fact.status === "reported").length
  const freshnessBoost = Math.max(0, 36 - hoursSince(article.updatedAt || article.createdAt)) * 0.25
  const statusBoost = article.status === "confirmed" ? 8 : article.status === "developing" ? 5 : 3

  return article.sourceCount * 9
    + article.articleCount * 2
    + confirmedFacts * 2.5
    + developingFacts
    + freshnessBoost
    + statusBoost
}

function selectPublishedDatabaseArticles(articles: ImpartialArticle[]): ImpartialArticle[] {
  const coherentArticles = dedupeArticles(articles.filter(isArticleCoherent))
  const withinPreferredWindow = coherentArticles.filter(article => hoursSince(article.updatedAt || article.createdAt) <= PREFERRED_WINDOW_HOURS)
  const candidatePool = withinPreferredWindow.length >= 12 ? withinPreferredWindow : coherentArticles

  return [...candidatePool].sort((left, right) => {
    const scoreDifference = articleEditorialScore(right) - articleEditorialScore(left)
    if (scoreDifference !== 0) return scoreDifference
    return new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime()
  })
}

export async function listPublishedArticles(): Promise<{
  articles: ImpartialArticle[]
  source: "database" | "generated" | "empty"
  warning?: string
}> {
  try {
    const databaseArticles = selectPublishedDatabaseArticles(await getDatabaseArticles())

    if (databaseArticles.length > 0) {
      return {
        articles: databaseArticles,
        source: "database",
        warning: databaseArticles.length < 12 || distinctCategories(databaseArticles) < 4
          ? "La portada prioriza las síntesis más sólidas de las últimas ediciones y conserva temas fuertes del día anterior cuando todavía no entró reemplazo suficiente."
          : undefined,
      }
    }

    const generatedArticles = (await getGeneratedEditorialStock()).filter(isArticleCoherent)

    if (generatedArticles.length > 0) {
      return {
        articles: generatedArticles,
        source: "generated",
        warning: "Todavía no hay una edición persistida suficiente en la base, así que se muestra una selección de respaldo construida desde varias coberturas.",
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
          articles: generatedArticles,
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
