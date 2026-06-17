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

// Generating a full edition with AI takes well over 60s; Fluid Compute
// allows up to 300s on every plan.
export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [pipelineResult, clickbaitResult] = await Promise.allSettled([
      generatePipelineRun({
        minSources: 2,
        // 12 notas por corrida entran holgadas en los 60s de maxDuration;
        // la frecuencia del cron compensa el volumen.
        limit: 12,
        generateArticles: true,
        persist: true,
      }),
      refreshDailyClickbaitEdition(),
    ])

    if (pipelineResult.status === "rejected") {
      throw pipelineResult.reason
    }

    const result = pipelineResult.value
    const clickbaitEdition = clickbaitResult.status === "fulfilled" ? clickbaitResult.value : null

    revalidatePath("/")
    revalidatePath("/nota/[slug]", "page")

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      generatedCount: result.generated.length,
      clickbaitCount: clickbaitEdition?.items.length || 0,
      errorCount: result.errors.length,
      warnings: [
        ...result.warnings,
        ...(clickbaitResult.status === "rejected"
          ? [{
              code: "clickbait_failed",
              message: clickbaitResult.reason instanceof Error
                ? clickbaitResult.reason.message
                : "Clickbait refresh failed",
            }]
          : []),
      ],
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
