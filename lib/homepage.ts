import { listPublishedArticles } from "./articles"
import { HOME_SECTION_ORDER, inferCategoryFromArticle, normalizeSectionSlug } from "./news-categories"
import type { ImpartialArticle } from "./types"

export interface HomepageSection {
  slug: string
  label: string
  lead?: ImpartialArticle
  articles: ImpartialArticle[]
}

export interface HomepageEdition {
  articles: ImpartialArticle[]
  source: "database" | "generated" | "mock"
  warning?: string
  sections: HomepageSection[]
}

export async function getHomepageEdition(activeSection?: string | null): Promise<HomepageEdition> {
  const sectionFilter = normalizeSectionSlug(activeSection)
  const published = await listPublishedArticles()

  let articles = published.articles
  if (sectionFilter) {
    const categoryLabel = HOME_SECTION_ORDER.find(section => section.slug === sectionFilter)?.label
    if (categoryLabel) {
      articles = published.articles.filter(article => inferCategoryFromArticle(article) === categoryLabel)
    }
  }

  const sections: HomepageSection[] = []

  for (const section of HOME_SECTION_ORDER) {
    if (sectionFilter && section.slug !== sectionFilter) continue

    const categoryArticles = published.articles.filter(article => inferCategoryFromArticle(article) === section.label)
    if (categoryArticles.length === 0) continue

    sections.push({
      slug: section.slug,
      label: section.label,
      lead: categoryArticles[0],
      articles: categoryArticles.slice(1, 5),
    })
  }

  return {
    articles: articles.length > 0 ? articles : published.articles,
    source: published.source,
    warning: published.warning,
    sections,
  }
}
