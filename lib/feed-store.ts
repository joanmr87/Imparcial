import { unstable_cache } from "next/cache"
import { fetchAllFeeds, type FetchResult } from "./rss-fetcher"
import type { RSSItem } from "./types"

export interface FeedSnapshot {
  collectedAt: string
  feedResults: FetchResult[]
  items: RSSItem[]
}

function dedupeFeedItems(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>()

  return items.filter(item => {
    const key = `${item.sourceId}:${item.link}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function buildLatestFeedSnapshot(): Promise<FeedSnapshot> {
  const feedResults = await fetchAllFeeds()

  return {
    collectedAt: new Date().toISOString(),
    feedResults,
    items: dedupeFeedItems(feedResults.flatMap(result => result.items)),
  }
}

export const getLatestFeedSnapshot = unstable_cache(
  buildLatestFeedSnapshot,
  ["latest-feed-snapshot"],
  { revalidate: 60 * 30 }
)
