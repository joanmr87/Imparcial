import { getGeneratedEditorialStock } from "./editorial-stock"
import { getArticleBySlug as getArticleFromMock, mockArticles } from "./mock-data"
import { inferCategoryFromArticle } from "./news-categories"
import { getDatabaseArticleBySlug, getDatabaseArticles, isTableMissingError } from "./supabase-admin"
import type { ImpartialArticle } from "./types"

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

export async function listPublishedArticles(): Promise<{
  articles: ImpartialArticle[]
  source: "database" | "generated" | "mock"
  warning?: string
}> {
  try {
    const databaseArticles = await getDatabaseArticles()
    const generatedArticles = await getGeneratedEditorialStock()
    const needsEditorialSupport = databaseArticles.length < 12 || distinctCategories(databaseArticles) < 4
    const articles = dedupeArticles(
      needsEditorialSupport
        ? [...generatedArticles, ...databaseArticles]
        : [...databaseArticles, ...generatedArticles]
    )

    if (articles.length > 0) {
      return {
        articles,
        source: databaseArticles.length > 0 ? "database" : "generated",
        warning: needsEditorialSupport
          ? "La edición se completa con síntesis recién generadas a partir de varias coberturas para ampliar temas y secciones mientras la base consolida más inventario."
          : undefined,
      }
    }

    return {
      articles: mockArticles,
      source: "mock",
      warning: "Database is reachable but empty. Serving mock articles for now.",
    }
  } catch (error) {
    return {
      articles: mockArticles,
      source: "mock",
      warning: isTableMissingError(error)
        ? "Database schema is missing. Serving mock articles."
        : `Database unavailable: ${(error as Error).message}`,
    }
  }
}

export async function findPublishedArticleBySlug(slug: string): Promise<{
  article: ImpartialArticle | null
  source: "database" | "generated" | "mock"
}> {
  try {
    const article = await getDatabaseArticleBySlug(slug)
    if (article) return { article, source: "database" }
  } catch {
    // Fall through to mock content.
  }

  const mockArticle = getArticleFromMock(slug) || null
  if (mockArticle) {
    return {
      article: mockArticle,
      source: "mock",
    }
  }

  try {
    const generatedArticles = await getGeneratedEditorialStock()
    const generatedArticle = generatedArticles.find(article => article.slug === slug)
    if (generatedArticle) {
      return { article: generatedArticle, source: "generated" }
    }
  } catch {
    // Fall through to mock content.
  }

  return { article: null, source: "mock" }
}
