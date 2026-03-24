import type { ImpartialArticle } from "./types"

const TITLE_STOPWORDS = new Set([
  "a", "al", "ante", "con", "contra", "de", "del", "desde", "el", "en", "entre",
  "la", "las", "los", "por", "para", "que", "se", "su", "sus", "un", "una", "y",
  "anos", "ano", "hoy", "dia", "dias",
])

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function tokenizeTitle(title: string): Set<string> {
  return new Set(
    normalizeText(title)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(token => token.length > 2 && !TITLE_STOPWORDS.has(token))
  )
}

function tokenizeArticle(article: ImpartialArticle): Set<string> {
  return tokenizeTitle([
    article.title,
    article.summary,
    article.facts.map(fact => fact.text).join(" "),
  ].join(" "))
}

function overlapScore(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0

  let intersection = 0
  for (const token of left) {
    if (right.has(token)) intersection += 1
  }

  const union = new Set([...left, ...right]).size
  return union === 0 ? 0 : intersection / union
}

function sourceNameSet(article: ImpartialArticle): Set<string> {
  return new Set(article.sources.map(source => normalizeText(source.name)))
}

function sharedSourceNames(left: ImpartialArticle, right: ImpartialArticle): boolean {
  const leftSources = sourceNameSet(left)
  for (const sourceName of sourceNameSet(right)) {
    if (leftSources.has(sourceName)) return true
    }
  return false
}

export function areArticlesNearDuplicate(left: ImpartialArticle, right: ImpartialArticle): boolean {
  const titleOverlap = overlapScore(tokenizeTitle(left.title), tokenizeTitle(right.title))
  const articleOverlap = overlapScore(tokenizeArticle(left), tokenizeArticle(right))

  if (titleOverlap >= 0.64) return true
  if (articleOverlap >= 0.58) return true
  if (titleOverlap >= 0.46 && sharedSourceNames(left, right)) return true

  return false
}

function articlePriority(article: ImpartialArticle): number {
  return article.sourceCount * 10
    + article.articleCount * 3
    + new Date(article.updatedAt).getTime() / 1_000_000_000_000
}

export function dedupeSimilarArticles(articles: ImpartialArticle[]): ImpartialArticle[] {
  const deduped: ImpartialArticle[] = []

  for (const article of articles) {
    const duplicateIndex = deduped.findIndex(existing => areArticlesNearDuplicate(existing, article))

    if (duplicateIndex === -1) {
      deduped.push(article)
      continue
    }

    if (articlePriority(article) > articlePriority(deduped[duplicateIndex])) {
      deduped[duplicateIndex] = article
    }
  }

  return deduped
}

export function pickDistinctArticles(
  articles: ImpartialArticle[],
  limit: number,
  overlapThreshold = 0.42
): ImpartialArticle[] {
  const selected: ImpartialArticle[] = []

  for (const article of articles) {
    const articleTokens = tokenizeArticle(article)
    const overlapsExisting = selected.some(existing => {
      const overlap = overlapScore(articleTokens, tokenizeArticle(existing))
      return overlap >= overlapThreshold
    })

    if (overlapsExisting) continue

    selected.push(article)
    if (selected.length >= limit) return selected
  }

  for (const article of articles) {
    if (selected.some(existing => existing.id === article.id)) continue
    selected.push(article)
    if (selected.length >= limit) break
  }

  return selected
}

export function prioritizeArticleVariety(articles: ImpartialArticle[], limit: number): ImpartialArticle[] {
  const selected: ImpartialArticle[] = []
  const categories = new Set<string>()

  for (const article of articles) {
    const categoryKey = normalizeText(article.category)
    if (categories.has(categoryKey)) continue
    selected.push(article)
    categories.add(categoryKey)
    if (selected.length >= limit) return selected
  }

  for (const article of articles) {
    if (selected.some(existing => existing.id === article.id)) continue
    selected.push(article)
    if (selected.length >= limit) break
  }

  return selected
}
