import { isArticleCoherent } from "./article-dedup"
import { getGeneratedEditorialStock } from "./editorial-stock"
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
  source: "database" | "generated" | "empty"
  warning?: string
}> {
  try {
    const databaseArticles = (await getDatabaseArticles()).filter(isArticleCoherent)
    const generatedArticles = (await getGeneratedEditorialStock()).filter(isArticleCoherent)
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
      articles: [],
      source: "empty",
      warning: "Todavía no hay síntesis suficientes construidas desde varias coberturas para abrir una edición completa.",
    }
  } catch (error) {
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
