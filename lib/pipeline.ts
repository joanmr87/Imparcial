import { generateImpartialArticle } from "./editorial"
import { rankClustersByRelevance } from "./news-ranking"
import { clusterNews, fetchAllFeeds } from "./rss-fetcher"
import { getEditorialSchemaStatus, upsertGeneratedArticle } from "./supabase-admin"
import type { ImpartialArticle, NewsCluster, PipelineWarning } from "./types"

export interface CollectClustersOptions {
  sourceIds?: string[]
  minSources?: number
  limit?: number
}

export interface GeneratePipelineOptions extends CollectClustersOptions {
  generateArticles?: boolean
  persist?: boolean
}

export async function collectLatestClusters(options: CollectClustersOptions = {}) {
  const { sourceIds, minSources = 2, limit = 18 } = options
  const feedResults = await fetchAllFeeds(sourceIds)
  const allItems = feedResults.flatMap(result => result.items)
  const warnings: PipelineWarning[] = feedResults
    .filter(result => result.error)
    .map(result => ({
      code: "feed_error",
      message: `${result.source.name}: ${result.error}`,
    }))

  const baseClusters = clusterNews(allItems)
    .filter(cluster => cluster.sourcesCount >= minSources)
    .slice(0, Math.max(limit * 2, 16))
  const clusters = (await rankClustersByRelevance(baseClusters)).slice(0, limit)

  return {
    timestamp: new Date().toISOString(),
    feedResults,
    allItems,
    clusters,
    warnings,
  }
}

export async function generatePipelineRun(options: GeneratePipelineOptions = {}) {
  const {
    generateArticles = true,
    persist = false,
    ...collectOptions
  } = options

  const collected = await collectLatestClusters(collectOptions)
  const editorialSchema = persist ? await getEditorialSchemaStatus() : null
  const warnings = [...collected.warnings]
  const generated: Array<{
    cluster: NewsCluster
    article: ImpartialArticle
    persisted: boolean
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
  }> = []
  const errors: Array<{ clusterId: string; message: string }> = []

  if (persist && editorialSchema && !editorialSchema.ready) {
    warnings.push({
      code: "schema_missing",
      message: `Persistence disabled because tables are missing: ${editorialSchema.missingTables.join(", ")}`,
    })
  }

  if (!generateArticles) {
    return {
      ...collected,
      generated,
      errors,
      schema: editorialSchema,
    }
  }

  for (const cluster of collected.clusters) {
    try {
      const { article, usage } = await generateImpartialArticle(cluster.topic, cluster.articles)

      let persisted = false
      if (persist && editorialSchema?.ready) {
        try {
          await upsertGeneratedArticle(article)
          persisted = true
        } catch (error) {
          warnings.push({
            code: "persist_failed",
            message: `No se pudo guardar "${article.title}": ${error instanceof Error ? error.message : "Unknown error"}`,
          })
        }
      }

      generated.push({
        cluster,
        article,
        persisted,
        usage,
      })
    } catch (error) {
      errors.push({
        clusterId: cluster.id,
        message: error instanceof Error ? error.message : "Unknown generation error",
      })
    }
  }

  return {
    ...collected,
    generated,
    errors,
    schema: editorialSchema,
  }
}
