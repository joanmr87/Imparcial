import { dedupeSimilarArticles, pickDistinctArticles, prioritizeArticleVariety } from "./article-dedup"
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

function interleaveSectionArticles(sections: HomepageSection[], limit: number): ImpartialArticle[] {
  const ordered: ImpartialArticle[] = []
  const buckets = sections.map(section => [section.lead, ...section.articles].filter(Boolean) as ImpartialArticle[])
  let index = 0

  while (ordered.length < limit) {
    let added = false

    for (const bucket of buckets) {
      const candidate = bucket[index]
      if (!candidate) continue
      if (ordered.some(article => article.id === candidate.id)) continue
      ordered.push(candidate)
      added = true
      if (ordered.length >= limit) break
    }

    if (!added) break
    index += 1
  }

  return ordered
}

export async function getHomepageEdition(activeSection?: string | null): Promise<HomepageEdition> {
  const sectionFilter = normalizeSectionSlug(activeSection)
  const published = await listPublishedArticles()
  const rankedArticles = prioritizeArticleVariety(dedupeSimilarArticles(published.articles), 24)

  let articles = rankedArticles
  if (sectionFilter) {
    const categoryLabel = HOME_SECTION_ORDER.find(section => section.slug === sectionFilter)?.label
    if (categoryLabel) {
      articles = pickDistinctArticles(
        rankedArticles.filter(article => inferCategoryFromArticle(article) === categoryLabel),
        12,
        0.36
      )
    }
  }

  const sections: HomepageSection[] = []

  for (const section of HOME_SECTION_ORDER) {
    if (sectionFilter && section.slug !== sectionFilter) continue

    const categoryArticles = pickDistinctArticles(
      rankedArticles.filter(article => inferCategoryFromArticle(article) === section.label),
      5,
      0.36
    )
    if (categoryArticles.length === 0) continue

    sections.push({
      slug: section.slug,
      label: section.label,
      lead: categoryArticles[0],
      articles: categoryArticles.slice(1, 5),
    })
  }

  if (!sectionFilter) {
    articles = interleaveSectionArticles(sections, 18)
  }

  return {
    articles: articles.length > 0 ? articles : rankedArticles,
    source: published.source,
    warning: published.warning,
    sections,
  }
}
