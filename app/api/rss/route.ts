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
    
    const clusteredNews = clusters
      .filter(cluster => cluster.sourcesCount >= 2)
      .sort((a, b) => b.sourcesCount - a.sourcesCount)
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sources: results.map(r => ({
        id: r.source.id,
        name: r.source.name,
        enabled: r.source.enabled !== false,
        itemCount: r.items.length,
        error: r.error,
        notes: r.source.notes,
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
