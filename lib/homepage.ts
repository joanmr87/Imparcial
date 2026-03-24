import { listPublishedArticles } from "./articles"
import { getLatestFeedSnapshot } from "./feed-store"
import { HOME_SECTION_ORDER, inferCategoryFromArticle, inferCategoryFromItem, normalizeSectionSlug } from "./news-categories"
import type { ImpartialArticle, RSSItem } from "./types"

export interface LiveBrief {
  id: string
  title: string
  summary: string
  url: string
  source: string
  category: string
  publishedAt: string
}

export interface HomepageSection {
  slug: string
  label: string
  lead?: ImpartialArticle
  articles: ImpartialArticle[]
  briefs: LiveBrief[]
}

export interface HomepageEdition {
  articles: ImpartialArticle[]
  source: "database" | "mock"
  warning?: string
  topBriefs: LiveBrief[]
  sections: HomepageSection[]
}

function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function truncateSummary(text: string, maxLength = 140): string {
  const compact = text.replace(/\s+/g, " ").trim()
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, maxLength).trimEnd()}...`
}

function dedupeBriefs(items: RSSItem[]): LiveBrief[] {
  const seenTitles = new Set<string>()

  return items
    .sort((left, right) => new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime())
    .filter(item => item.description.trim().length > 0)
    .map(item => ({
      id: `${item.sourceId}:${item.link}`,
      title: item.title,
      summary: truncateSummary(item.description, 130),
      url: item.link,
      source: item.source,
      category: inferCategoryFromItem(item),
      publishedAt: item.pubDate,
    }))
    .filter(item => {
      const normalizedTitle = normalizeTitle(item.title)
      if (seenTitles.has(normalizedTitle)) return false
      seenTitles.add(normalizedTitle)
      return true
    })
}

function takeUniqueBriefs(items: LiveBrief[], usedTitles: Set<string>, count: number): LiveBrief[] {
  const selected: LiveBrief[] = []

  for (const item of items) {
    const normalizedTitle = normalizeTitle(item.title)
    if (usedTitles.has(normalizedTitle)) continue

    usedTitles.add(normalizedTitle)
    selected.push(item)

    if (selected.length >= count) break
  }

  return selected
}

export async function getHomepageEdition(activeSection?: string | null): Promise<HomepageEdition> {
  const sectionFilter = normalizeSectionSlug(activeSection)
  const published = await listPublishedArticles()
  const { items } = await getLatestFeedSnapshot()
  const liveBriefs = dedupeBriefs(items)
  const publishedArticleTitles = new Set(published.articles.map(article => normalizeTitle(article.title)))
  const usedBriefTitles = new Set<string>()

  let articles = published.articles
  if (sectionFilter) {
    const categoryLabel = HOME_SECTION_ORDER.find(section => section.slug === sectionFilter)?.label
    if (categoryLabel) {
      articles = published.articles.filter(article => inferCategoryFromArticle(article) === categoryLabel)
    }
  }

  const availableBriefs = liveBriefs.filter(item => !publishedArticleTitles.has(normalizeTitle(item.title)))
  const topBriefs = takeUniqueBriefs(
    availableBriefs.filter(item => !sectionFilter || normalizeSectionSlug(item.category.toLowerCase()) === sectionFilter),
    usedBriefTitles,
    6
  )

  const sections: HomepageSection[] = []

  for (const section of HOME_SECTION_ORDER) {
    if (sectionFilter && section.slug !== sectionFilter) continue

    const categoryArticles = published.articles.filter(article => inferCategoryFromArticle(article) === section.label)
    const categoryBriefs = takeUniqueBriefs(
      availableBriefs.filter(item => item.category === section.label),
      usedBriefTitles,
      3
    )

    if (!categoryArticles[0] && categoryBriefs.length === 0) continue

    sections.push({
      slug: section.slug,
      label: section.label,
      lead: categoryArticles[0],
      articles: categoryArticles.slice(1, 4),
      briefs: categoryBriefs,
    })
  }

  return {
    articles: articles.length > 0 ? articles : published.articles,
    source: published.source,
    warning: published.warning,
    topBriefs,
    sections,
  }
}
