import { getArticleBySlug as getArticleFromMock, mockArticles } from "./mock-data"
import { getDatabaseArticleBySlug, getDatabaseArticles, isTableMissingError } from "./supabase-admin"
import type { ImpartialArticle } from "./types"

export async function listPublishedArticles(): Promise<{
  articles: ImpartialArticle[]
  source: "database" | "mock"
  warning?: string
}> {
  try {
    const articles = await getDatabaseArticles()

    if (articles.length > 0) {
      return { articles, source: "database" }
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
  source: "database" | "mock"
}> {
  try {
    const article = await getDatabaseArticleBySlug(slug)
    if (article) return { article, source: "database" }
  } catch {
    // Fall through to mock content.
  }

  return {
    article: getArticleFromMock(slug) || null,
    source: "mock",
  }
}
