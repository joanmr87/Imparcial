import { NextResponse } from 'next/server'
import { fetchAllFeeds, clusterNews } from '@/lib/rss-fetcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

export async function POST(request: Request) {
  try {
    const { sourceIds, minSources = 2 } = await request.json()

    // Step 1: Fetch RSS feeds
    const feedResults = await fetchAllFeeds(sourceIds)
    
    // Combine all items
    const allItems = feedResults.flatMap(r => r.items)
    
    if (allItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se pudieron obtener articulos de las fuentes'
      }, { status: 400 })
    }

    // Step 2: Cluster similar news
    const clusters = clusterNews(allItems)
    
    // Filter clusters with enough sources
    const validClusters = Array.from(clusters.entries())
      .filter(([, items]) => {
        const uniqueSources = new Set(items.map(i => i.sourceId))
        return uniqueSources.size >= minSources
      })
      .map(([id, items]) => ({
        id,
        topic: items[0].title,
        articles: items.map(item => ({
          source: item.source,
          title: item.title,
          description: item.description,
          link: item.link,
          pubDate: item.pubDate
        })),
        sourcesCount: new Set(items.map(i => i.sourceId)).size
      }))
      .sort((a, b) => b.sourcesCount - a.sourcesCount)
      .slice(0, 10) // Top 10 clusters for processing

    if (validClusters.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No se encontraron noticias con al menos ${minSources} fuentes coincidentes`
      }, { status: 400 })
    }

    // Step 3: Process each cluster with AI
    // For MVP, we'll return the clusters and let the client decide which to process
    // Full processing would call the /api/process endpoint for each cluster

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      feedsSummary: {
        sourcesQueried: feedResults.length,
        sourcesWithArticles: feedResults.filter(r => r.items.length > 0).length,
        totalArticles: allItems.length,
        errors: feedResults.filter(r => r.error).map(r => ({
          source: r.source.name,
          error: r.error
        }))
      },
      clusters: validClusters,
      message: `Se encontraron ${validClusters.length} temas con ${minSources}+ fuentes. Use /api/process para generar notas imparciales.`
    })

  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar contenido' },
      { status: 500 }
    )
  }
}
