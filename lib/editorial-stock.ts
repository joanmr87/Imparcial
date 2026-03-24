import { unstable_cache } from "next/cache"
import { generateImpartialArticle } from "./editorial"
import { inferCategoryFromItem } from "./news-categories"
import { clusterNews, fetchAllFeeds } from "./rss-fetcher"
import type { ImpartialArticle, NewsCluster } from "./types"

const GENERATED_STOCK_LIMIT = 18
const STOCK_CATEGORY_TARGETS = {
  Politica: 6,
  Economia: 4,
  Sociedad: 4,
  Deportes: 4,
} as const

function inferClusterCategory(cluster: NewsCluster): string {
  const counts = new Map<string, number>()

  for (const article of cluster.articles) {
    const category = inferCategoryFromItem(article)
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "Sociedad"
}

export function selectClustersForEditorialStock(clusters: NewsCluster[], limit: number): NewsCluster[] {
  const buckets = new Map<string, NewsCluster[]>()

  for (const cluster of clusters) {
    const category = inferClusterCategory(cluster)
    const bucket = buckets.get(category) || []
    bucket.push(cluster)
    buckets.set(category, bucket)
  }

  const selected: NewsCluster[] = []

  for (const [category, target] of Object.entries(STOCK_CATEGORY_TARGETS)) {
    const bucket = buckets.get(category) || []
    selected.push(...bucket.slice(0, target))
    buckets.set(category, bucket.slice(target))
    if (selected.length >= limit) return selected.slice(0, limit)
  }

  const remaining = [...buckets.values()].flat()

  for (const cluster of remaining) {
    if (selected.some(item => item.id === cluster.id)) continue
    selected.push(cluster)
    if (selected.length >= limit) break
  }

  return selected
}

async function buildGeneratedEditorialStock(): Promise<ImpartialArticle[]> {
  try {
    const feedResults = await fetchAllFeeds()
    const allItems = feedResults.flatMap(result => result.items)
    const allClusters = clusterNews(allItems).filter(cluster => cluster.sourcesCount >= 2)
    const selectedClusters = selectClustersForEditorialStock(allClusters, GENERATED_STOCK_LIMIT)
    const articles = await Promise.all(
      selectedClusters.map(async cluster => {
        const result = await generateImpartialArticle(cluster.topic, cluster.articles, { useAi: false })
        return result.article
      })
    )

    return articles
  } catch {
    return []
  }
}

export const getGeneratedEditorialStock = unstable_cache(
  buildGeneratedEditorialStock,
  ["generated-editorial-stock-v5"],
  { revalidate: 60 * 30 }
)
