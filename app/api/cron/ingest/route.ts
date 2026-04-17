import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { refreshDailyClickbaitEdition } from "@/lib/clickbait"
import { generatePipelineRun } from "@/lib/pipeline"

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) return true

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${expectedSecret}`
}

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [result, clickbaitEdition] = await Promise.all([
      generatePipelineRun({
        minSources: 2,
        limit: 18,
        generateArticles: true,
        persist: true,
      }),
      refreshDailyClickbaitEdition(),
    ])

    revalidatePath("/")
    revalidatePath("/nota/[slug]", "page")

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      generatedCount: result.generated.length,
      clickbaitCount: clickbaitEdition.items.length,
      errorCount: result.errors.length,
      warnings: result.warnings,
      schema: result.schema,
      clickbaitEdition,
      generated: result.generated.map(item => ({
        clusterId: item.cluster.id,
        title: item.article.title,
        slug: item.article.slug,
        persisted: item.persisted,
      })),
      errors: result.errors,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Cron ingest failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
