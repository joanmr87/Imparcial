import { NEWS_SOURCES, type NewsSource } from './sources'

export interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
  sourceId: string
}

export interface FetchResult {
  source: NewsSource
  items: RSSItem[]
  error?: string
}

// Simple XML parser for RSS feeds
function parseRSSXML(xml: string, source: NewsSource): RSSItem[] {
  const items: RSSItem[] = []
  
  // Extract items using regex (simple approach for MVP)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1]
    
    const title = extractTag(itemContent, 'title')
    const link = extractTag(itemContent, 'link')
    const description = extractTag(itemContent, 'description')
    const pubDate = extractTag(itemContent, 'pubDate')

    if (title && link) {
      items.push({
        title: cleanText(title),
        link,
        description: cleanText(description || ''),
        pubDate: pubDate || new Date().toISOString(),
        source: source.name,
        sourceId: source.id
      })
    }
  }

  return items
}

function extractTag(content: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const cdataMatch = content.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1]

  // Handle regular content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = content.match(regex)
  return match ? match[1] : null
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export async function fetchRSSFeed(source: NewsSource): Promise<FetchResult> {
  try {
    const response = await fetch(source.rssUrl, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: {
        'User-Agent': 'DiarioImparcial/1.0 (news aggregator)',
      }
    })

    if (!response.ok) {
      return {
        source,
        items: [],
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const xml = await response.text()
    const items = parseRSSXML(xml, source)

    return {
      source,
      items: items.slice(0, 20) // Limit to 20 items per source
    }
  } catch (error) {
    return {
      source,
      items: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function fetchAllFeeds(sourceIds?: string[]): Promise<FetchResult[]> {
  const sources = sourceIds 
    ? NEWS_SOURCES.filter(s => sourceIds.includes(s.id))
    : NEWS_SOURCES.filter(s => s.priority === 'high')

  const results = await Promise.allSettled(
    sources.map(source => fetchRSSFeed(source))
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      source: sources[index],
      items: [],
      error: 'Failed to fetch'
    }
  })
}

// Cluster similar news items based on title similarity
export function clusterNews(allItems: RSSItem[]): Map<string, RSSItem[]> {
  const clusters = new Map<string, RSSItem[]>()
  
  // Simple clustering based on keyword overlap
  // In production, use proper NLP/embeddings
  for (const item of allItems) {
    const keywords = extractKeywords(item.title)
    let foundCluster = false

    for (const [clusterId, clusterItems] of clusters) {
      const clusterKeywords = extractKeywords(clusterItems[0].title)
      const overlap = calculateOverlap(keywords, clusterKeywords)
      
      if (overlap > 0.4) { // 40% keyword overlap threshold
        clusterItems.push(item)
        foundCluster = true
        break
      }
    }

    if (!foundCluster) {
      clusters.set(item.link, [item])
    }
  }

  return clusters
}

function extractKeywords(text: string): Set<string> {
  const stopwords = new Set([
    'el', 'la', 'los', 'las', 'de', 'del', 'en', 'a', 'y', 'que', 'para',
    'por', 'con', 'un', 'una', 'su', 'se', 'es', 'al', 'como', 'mas', 'sobre'
  ])
  
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopwords.has(word))
  )
}

function calculateOverlap(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  return intersection.size / union.size
}
