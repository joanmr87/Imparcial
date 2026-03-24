import { unstable_cache } from "next/cache"
import { generatePipelineRun } from "./pipeline"
import type { ImpartialArticle } from "./types"

const GENERATED_STOCK_LIMIT = 18

async function buildGeneratedEditorialStock(): Promise<ImpartialArticle[]> {
  try {
    const result = await generatePipelineRun({
      minSources: 2,
      limit: GENERATED_STOCK_LIMIT,
      generateArticles: true,
      persist: false,
      useAi: false,
    })

    return result.generated.map(item => item.article)
  } catch {
    return []
  }
}

export const getGeneratedEditorialStock = unstable_cache(
  buildGeneratedEditorialStock,
  ["generated-editorial-stock-v2"],
  { revalidate: 60 * 30 }
)
