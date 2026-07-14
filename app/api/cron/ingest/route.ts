import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { refreshDailyClickbaitEdition } from "@/lib/clickbait"
import { authorizeInternalRequest } from "@/lib/internal-auth"
import { generatePipelineRun } from "@/lib/pipeline"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = authorizeInternalRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const requestedTask = new URL(request.url).searchParams.get("task") || "all"
  if (!["all", "articles", "clickbait"].includes(requestedTask)) {
    return NextResponse.json({ success: false, error: "Invalid task" }, { status: 400 })
  }

  try {
    const shouldRefreshArticles = requestedTask !== "clickbait"
    const shouldRefreshClickbait = requestedTask !== "articles"
    const [pipelineResult, clickbaitResult] = await Promise.allSettled([
      shouldRefreshArticles
        ? generatePipelineRun({
            minSources: 2,
            limit: 12,
            generateArticles: true,
            persist: true,
          })
        : Promise.resolve(null),
      shouldRefreshClickbait
        ? refreshDailyClickbaitEdition()
        : Promise.resolve(null),
    ])

    if (shouldRefreshArticles && pipelineResult.status === "rejected") {
      throw pipelineResult.reason
    }

    const result = pipelineResult.status === "fulfilled" ? pipelineResult.value : null
    const clickbaitEdition = clickbaitResult.status === "fulfilled" ? clickbaitResult.value : null

    revalidatePath("/")
    revalidatePath("/nota/[slug]", "page")

    return NextResponse.json({
      success: true,
      task: requestedTask,
      timestamp: result?.timestamp || new Date().toISOString(),
      generatedCount: result?.generated.length || 0,
      clickbaitCount: clickbaitEdition?.items.length || 0,
      errorCount: result?.errors.length || 0,
      warnings: [
        ...(result?.warnings || []),
        ...(shouldRefreshClickbait && clickbaitResult.status === "rejected"
          ? [{
              code: "clickbait_failed",
              message: clickbaitResult.reason instanceof Error
                ? clickbaitResult.reason.message
                : "Clickbait refresh failed",
            }]
          : []),
      ],
      schema: result?.schema || null,
      clickbaitEdition,
      generated: (result?.generated || []).map(item => ({
        clusterId: item.cluster.id,
        title: item.article.title,
        slug: item.article.slug,
        persisted: item.persisted,
      })),
      errors: result?.errors || [],
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
