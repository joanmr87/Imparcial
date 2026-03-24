import { getEnabledSources, NEWS_SOURCES, type NewsSource } from "./sources"
import { inferCategoryFromItem } from "./news-categories"
import { isBlockedExternalSource } from "./source-safety"
import { coherentTopicGroups, isStrongTopicMatch } from "./topic-coherence"
import type { NewsCluster, RSSItem } from "./types"

export interface FetchResult {
  source: NewsSource
  items: RSSItem[]
  error?: string
}

const FETCH_TIMEOUT_MS = 15000
const MAX_ITEMS_PER_SOURCE = 25
const CLUSTER_TIME_WINDOW_MS = 36 * 60 * 60 * 1000

const STOPWORDS = new Set([
  "a", "al", "ante", "ayer", "bajo", "como", "con", "contra", "cuál", "cuales",
  "cuándo", "de", "del", "desde", "donde", "dos", "el", "ella", "ellas", "ellos",
  "en", "entre", "era", "es", "esa", "ese", "eso", "esta", "este", "esto", "fue",
  "fueron", "hay", "hoy", "la", "las", "lo", "los", "más", "menos", "mi", "mis",
  "mientras", "muy", "no", "o", "para", "pero", "por", "qué", "que", "quien",
  "quienes", "se", "según", "ser", "sin", "sobre", "su", "sus", "tras", "un",
  "una", "uno", "unos", "unas", "ya", "enero", "febrero", "marzo", "abril",
  "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre",
  "diciembre", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado",
  "domingo", "ultima", "ultimas", "minuto", "vivo"
])

const NOISE_PATTERNS = [
  /\b(loteria|quiniela|sorteo|resultado sinuano|chance|jackpot|horoscopo)\b/,
  /\b(numeros? ganadores?|premio mayor|apuesta)\b/,
]

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractImageUrl(content: string): string | undefined {
  const mediaContentMatch = content.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["'][^>]*\/?>/i)
  if (mediaContentMatch) return mediaContentMatch[1].replace(/&amp;/g, "&")

  const enclosureMatch = content.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["'][^>]*\/?>/i)
  if (enclosureMatch) return enclosureMatch[1].replace(/&amp;/g, "&")

  const imageTagMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
  if (imageTagMatch) return imageTagMatch[1].replace(/&amp;/g, "&")

  return undefined
}

function extractTag(content: string, tag: string): string | null {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i")
  const cdataMatch = content.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1]

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  const match = content.match(regex)
  return match ? match[1] : null
}

function extractAtomLink(content: string): string | null {
  const match = content.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)
  return match ? match[1] : null
}

function extractLink(content: string): string | null {
  return extractTag(content, "link") || extractAtomLink(content)
}

function extractItems(xml: string): string[] {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => match[0])
  if (itemMatches.length > 0) return itemMatches

  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(match => match[0])
}

function parseRSSXML(xml: string, source: NewsSource): RSSItem[] {
  const parsedItems: Array<RSSItem | null> = extractItems(xml)
    .map(itemContent => {
      const title = cleanText(extractTag(itemContent, "title") || "")
      const link = extractLink(itemContent)
      const rawDescription =
        extractTag(itemContent, "description") ||
        extractTag(itemContent, "summary") ||
        extractTag(itemContent, "content") ||
        extractTag(itemContent, "content:encoded") ||
        ""
      const description = cleanText(
        rawDescription
      )
      const pubDate = extractTag(itemContent, "pubDate") ||
        extractTag(itemContent, "published") ||
        extractTag(itemContent, "updated") ||
        new Date().toISOString()
      const imageUrl = extractImageUrl(itemContent) || extractImageUrl(rawDescription)

      if (!title || !link) return null

      return {
        title,
        link,
        description,
        pubDate,
        source: source.name,
        sourceId: source.id,
        imageUrl,
      }
    })

  return parsedItems.filter((item): item is RSSItem => item !== null)
}

function dedupeItems(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>()

  return items.filter(item => {
    const key = `${item.sourceId}:${item.link}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function shouldIgnoreItem(item: RSSItem): boolean {
  const text = normalizeText(`${item.title} ${item.description} ${item.link}`)

  if (NOISE_PATTERNS.some(pattern => pattern.test(text))) {
    return true
  }

  if (isBlockedExternalSource(item)) {
    return true
  }

  return false
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOPWORDS.has(token))
}

function toKeywordSet(item: RSSItem): Set<string> {
  return new Set(tokenize(`${item.title} ${item.description}`))
}

function getNumberTokens(item: RSSItem): Set<string> {
  const matches = `${item.title} ${item.description}`.match(/\b\d+[.,]?\d*\b/g)
  return new Set(matches || [])
}

function overlapScore(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0

  const intersection = [...setA].filter(token => setB.has(token)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

function countSharedTokens(setA: Set<string>, setB: Set<string>): number {
  return [...setA].filter(token => setB.has(token)).length
}

function isWithinWindow(left: string, right: string): boolean {
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return true
  return Math.abs(leftTime - rightTime) <= CLUSTER_TIME_WINDOW_MS
}

interface MutableCluster {
  id: string
  items: RSSItem[]
  keywordSet: Set<string>
  numberSet: Set<string>
  canonicalTitle: string
  firstPublishedAt: string
  lastPublishedAt: string
}

function inferClusterCategory(cluster: MutableCluster): string {
  const counts = new Map<string, number>()

  for (const item of cluster.items) {
    const category = inferCategoryFromItem(item)
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "Sociedad"
}

function findBestCluster(item: RSSItem, clusters: MutableCluster[]): MutableCluster | null {
  const itemCategory = inferCategoryFromItem(item)

  let bestMatch: MutableCluster | null = null
  let bestScore = 0

  for (const cluster of clusters) {
    const hasSameSource = cluster.items.some(clusterItem => clusterItem.sourceId === item.sourceId)
    if (hasSameSource) continue
    if (!isWithinWindow(item.pubDate, cluster.lastPublishedAt)) continue

    const clusterCategory = inferClusterCategory(cluster)
    if (itemCategory !== clusterCategory && (itemCategory === "Deportes" || clusterCategory === "Deportes")) {
      continue
    }

    const bestPairMatch = cluster.items.reduce((currentBest, clusterItem) => {
      const pairKeywordsLeft = toKeywordSet(item)
      const pairKeywordsRight = toKeywordSet(clusterItem)
      const pairNumbersLeft = getNumberTokens(item)
      const pairNumbersRight = getNumberTokens(clusterItem)
      const keywordOverlap = overlapScore(pairKeywordsLeft, pairKeywordsRight)
      const sharedTokens = countSharedTokens(pairKeywordsLeft, pairKeywordsRight)
      const numberOverlap = overlapScore(pairNumbersLeft, pairNumbersRight)

      return keywordOverlap * 0.75 + numberOverlap * 0.25 > currentBest.score
        ? {
            score: keywordOverlap * 0.75 + numberOverlap * 0.25,
            sharedTokens,
            numberOverlap,
            keywordOverlap,
            strongTopicMatch: isStrongTopicMatch(item, clusterItem),
          }
        : currentBest
    }, {
      score: 0,
      sharedTokens: 0,
      numberOverlap: 0,
      keywordOverlap: 0,
      strongTopicMatch: false,
    })

    const isSportsCluster = itemCategory === "Deportes" && clusterCategory === "Deportes"
    const score = bestPairMatch.score
    const matchesDefaultThreshold =
      bestPairMatch.strongTopicMatch &&
      ((bestPairMatch.sharedTokens >= 2 && score >= 0.16) || score >= 0.28)
    const matchesSportsThreshold =
      isSportsCluster &&
      bestPairMatch.strongTopicMatch &&
      ((bestPairMatch.sharedTokens >= 2 && score >= 0.14) || (bestPairMatch.sharedTokens >= 1 && bestPairMatch.keywordOverlap >= 0.22 && bestPairMatch.numberOverlap >= 0.08))

    if (matchesDefaultThreshold || matchesSportsThreshold) {
      if (score > bestScore) {
        bestScore = score
        bestMatch = cluster
      }
    }
  }

  return bestMatch
}

function mergeIntoCluster(cluster: MutableCluster, item: RSSItem) {
  cluster.items.push(item)

  for (const token of toKeywordSet(item)) {
    cluster.keywordSet.add(token)
  }

  for (const numberToken of getNumberTokens(item)) {
    cluster.numberSet.add(numberToken)
  }

  if (item.title.length > cluster.canonicalTitle.length) {
    cluster.canonicalTitle = item.title
  }

  if (new Date(item.pubDate).getTime() < new Date(cluster.firstPublishedAt).getTime()) {
    cluster.firstPublishedAt = item.pubDate
  }

  if (new Date(item.pubDate).getTime() > new Date(cluster.lastPublishedAt).getTime()) {
    cluster.lastPublishedAt = item.pubDate
  }
}

function rankKeywords(cluster: MutableCluster): string[] {
  const counts = new Map<string, number>()

  for (const item of cluster.items) {
    for (const token of new Set(tokenize(item.title))) {
      counts.set(token, (counts.get(token) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([token]) => token)
}

function getFeedUrls(source: NewsSource): string[] {
  const urls = [
    source.rssUrl,
    ...(source.rssUrls || []),
  ].filter((value): value is string => Boolean(value))

  return [...new Set(urls)]
}

async function fetchFeedUrl(source: NewsSource, url: string): Promise<RSSItem[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "DiarioImparcial/1.0 (+https://diarioimparcial.vercel.app)",
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xml = await response.text()
    const items = dedupeItems(parseRSSXML(xml, source))
      .filter(item => !shouldIgnoreItem(item))
      .slice(0, MAX_ITEMS_PER_SOURCE)

    if (items.length === 0) {
      throw new Error("Feed responded but no RSS items were parsed")
    }

    return items
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchRSSFeed(source: NewsSource): Promise<FetchResult> {
  const feedUrls = getFeedUrls(source)

  const results = await Promise.allSettled(feedUrls.map(url => fetchFeedUrl(source, url)))
  const items = dedupeItems(
    results.flatMap(result => result.status === "fulfilled" ? result.value : [])
  ).slice(0, MAX_ITEMS_PER_SOURCE * Math.max(1, feedUrls.length))

  const errors = results
    .flatMap((result, index) => {
      if (result.status === "fulfilled") return []
      const message = result.reason instanceof Error ? result.reason.message : "Unknown error"
      return [`${feedUrls[index]}: ${message}`]
    })

  return {
    source,
    items,
    error: items.length === 0 && errors.length > 0 ? errors.join(" | ") : undefined,
  }
}

export async function fetchAllFeeds(sourceIds?: string[]): Promise<FetchResult[]> {
  const availableSources = sourceIds && sourceIds.length > 0
    ? NEWS_SOURCES.filter(source => source.enabled !== false && sourceIds.includes(source.id))
    : getEnabledSources().filter(source => source.priority !== "low")

  const results = await Promise.allSettled(availableSources.map(source => fetchRSSFeed(source)))

  return results.map((result, index) => {
    if (result.status === "fulfilled") return result.value

    return {
      source: availableSources[index],
      items: [],
      error: "Failed to fetch feed",
    }
  })
}

export function clusterNews(allItems: RSSItem[]): NewsCluster[] {
  const sortedItems = dedupeItems(allItems).sort(
    (left, right) => new Date(left.pubDate).getTime() - new Date(right.pubDate).getTime()
  )

  const clusters: MutableCluster[] = []

  for (const item of sortedItems) {
    const match = findBestCluster(item, clusters)

    if (match) {
      mergeIntoCluster(match, item)
      continue
    }

    clusters.push({
      id: item.link,
      items: [item],
      keywordSet: toKeywordSet(item),
      numberSet: getNumberTokens(item),
      canonicalTitle: item.title,
      firstPublishedAt: item.pubDate,
      lastPublishedAt: item.pubDate,
    })
  }

  const coherentClusters = clusters.flatMap(cluster => {
    const groups = coherentTopicGroups(cluster.items)

    return groups.map(group => {
      const sortedGroup = [...group].sort(
        (left, right) => new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime()
      )
      const canonicalTitle = [...group]
        .sort((left, right) => right.title.length - left.title.length)[0]?.title || cluster.canonicalTitle
      const mutableGroup: MutableCluster = {
        id: sortedGroup[0]?.link || cluster.id,
        items: sortedGroup,
        keywordSet: new Set(group.flatMap(item => [...toKeywordSet(item)])),
        numberSet: new Set(group.flatMap(item => [...getNumberTokens(item)])),
        canonicalTitle,
        firstPublishedAt: [...group]
          .sort((left, right) => new Date(left.pubDate).getTime() - new Date(right.pubDate).getTime())[0]?.pubDate || cluster.firstPublishedAt,
        lastPublishedAt: sortedGroup[0]?.pubDate || cluster.lastPublishedAt,
      }

      return {
        id: mutableGroup.id,
        topic: mutableGroup.canonicalTitle,
        canonicalTitle: mutableGroup.canonicalTitle,
        articles: sortedGroup,
        sourcesCount: new Set(sortedGroup.map(item => item.sourceId)).size,
        keywords: rankKeywords(mutableGroup),
        firstPublishedAt: mutableGroup.firstPublishedAt,
        lastPublishedAt: mutableGroup.lastPublishedAt,
      }
    })
  })

  return coherentClusters
    .sort((left, right) => {
      if (right.sourcesCount !== left.sourcesCount) return right.sourcesCount - left.sourcesCount
      if (right.articles.length !== left.articles.length) return right.articles.length - left.articles.length
      return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime()
    })
}
