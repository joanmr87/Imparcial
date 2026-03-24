import { NextResponse } from 'next/server'
import { fetchAllFeeds, clusterNews } from '@/lib/rss-fetcher'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sourcesParam = searchParams.get('sources')
    const sourceIds = sourcesParam ? sourcesParam.split(',') : undefined

    const results = await fetchAllFeeds(sourceIds)

    // Combine all items
    const allItems = results.flatMap(r => r.items)
    
    // Cluster similar news
    const clusters = clusterNews(allItems)
    
    // Format response
    const clusteredNews = Array.from(clusters.entries())
      .map(([id, items]) => ({
        id,
        topic: items[0].title,
        articles: items,
        sourcesCount: new Set(items.map(i => i.sourceId)).size
      }))
      .filter(cluster => cluster.sourcesCount >= 2) // Only clusters with 2+ sources
      .sort((a, b) => b.sourcesCount - a.sourcesCount)
      .slice(0, 20) // Top 20 clusters

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sources: results.map(r => ({
        id: r.source.id,
        name: r.source.name,
        itemCount: r.items.length,
        error: r.error
      })),
      clusters: clusteredNews,
      totalArticles: allItems.length,
      totalClusters: clusteredNews.length
    })
  } catch (error) {
    console.error('RSS fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RSS feeds' },
      { status: 500 }
    )
  }
}
