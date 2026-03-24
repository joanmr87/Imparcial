import { NextResponse } from "next/server"
import { generatePipelineRun } from "@/lib/pipeline"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      sourceIds?: string[]
      minSources?: number
      limit?: number
      generateArticles?: boolean
      persist?: boolean
    }

    const result = await generatePipelineRun({
      sourceIds: body.sourceIds,
      minSources: body.minSources ?? 2,
      limit: body.limit ?? 6,
      generateArticles: body.generateArticles ?? true,
      persist: body.persist ?? false,
    })

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      feedsSummary: {
        sourcesQueried: result.feedResults.length,
        sourcesWithArticles: result.feedResults.filter(feed => feed.items.length > 0).length,
        totalArticles: result.allItems.length,
      },
      clusters: result.clusters,
      generated: result.generated,
      errors: result.errors,
      warnings: result.warnings,
      schema: result.schema,
    })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar contenido",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
