import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { inferCategoryFromItem } from "./news-categories"
import type { NewsCluster } from "./types"

const clusterRankingSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      relevanceScore: z.number().min(1).max(10),
    })
  ),
})

const TITLE_STOPWORDS = new Set([
  "a", "al", "ante", "con", "contra", "de", "del", "desde", "el", "en", "entre",
  "la", "las", "los", "para", "por", "que", "se", "su", "sus", "un", "una", "y",
  "hoy", "ayer", "anos", "ano", "marcha", "acto",
])

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(token => token.length > 2 && !TITLE_STOPWORDS.has(token))
  )
}

function overlapScore(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0

  let intersection = 0
  for (const token of left) {
    if (right.has(token)) intersection += 1
  }

  const union = new Set([...left, ...right]).size
  return union === 0 ? 0 : intersection / union
}

function clusterTokenSet(cluster: NewsCluster): Set<string> {
  return tokenize(`${cluster.canonicalTitle} ${cluster.keywords.join(" ")}`)
}

function clusterCategory(cluster: NewsCluster): string {
  const counts = new Map<string, number>()

  for (const article of cluster.articles) {
    const category = inferCategoryFromItem(article)
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "Sociedad"
}

function heuristicClusterScore(cluster: NewsCluster): number {
  const categoryWeight = {
    Politica: 9,
    Economia: 8,
    Sociedad: 7,
    Deportes: 6,
    Internacional: 5,
  }[clusterCategory(cluster)] || 4

  const freshnessHours = Math.max(
    0,
    (Date.now() - new Date(cluster.lastPublishedAt).getTime()) / (1000 * 60 * 60)
  )

  return categoryWeight * 4
    + cluster.sourcesCount * 5
    + Math.min(cluster.articles.length, 5) * 2
    - Math.min(freshnessHours, 24) * 0.25
}

function dedupeSimilarClusters(clusters: NewsCluster[]): NewsCluster[] {
  const deduped: Array<NewsCluster & { heuristic: number }> = []

  for (const cluster of clusters) {
    const candidate = { ...cluster, heuristic: heuristicClusterScore(cluster) }
    const tokens = clusterTokenSet(cluster)
    const duplicateIndex = deduped.findIndex(existing => {
      const tokenOverlap = overlapScore(tokens, clusterTokenSet(existing))
      const sameCategory = clusterCategory(existing) === clusterCategory(cluster)
      return tokenOverlap >= 0.62 || (sameCategory && tokenOverlap >= 0.5)
    })

    if (duplicateIndex === -1) {
      deduped.push(candidate)
      continue
    }

    if (candidate.heuristic > deduped[duplicateIndex].heuristic) {
      deduped[duplicateIndex] = candidate
    }
  }

  return deduped.map(({ heuristic: _heuristic, ...cluster }) => cluster)
}

export async function rankClustersByRelevance(clusters: NewsCluster[]): Promise<NewsCluster[]> {
  if (clusters.length === 0) return clusters

  const dedupedClusters = dedupeSimilarClusters(clusters)
  const heuristicScores = new Map(
    dedupedClusters.map(cluster => [cluster.id, heuristicClusterScore(cluster)])
  )

  if (!process.env.OPENAI_API_KEY) {
    return [...dedupedClusters].sort((left, right) => {
      const scoreDifference = (heuristicScores.get(right.id) || 0) - (heuristicScores.get(left.id) || 0)
      if (scoreDifference !== 0) return scoreDifference
      return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime()
    })
  }

  const prompt = dedupedClusters
    .map((cluster, index) => [
      `Cluster ${index + 1}`,
      `ID: ${cluster.id}`,
      `Tema: ${cluster.topic}`,
      `Titulo canonico: ${cluster.canonicalTitle}`,
      `Fuentes distintas: ${cluster.sourcesCount}`,
      `Ultima publicacion: ${cluster.lastPublishedAt}`,
      `Categoria inferida: ${clusterCategory(cluster)}`,
      `Titulos ejemplo:`,
      ...cluster.articles.slice(0, 4).map(article => `- ${article.source}: ${article.title}`),
    ].join("\n"))
    .join("\n\n---\n\n")

  try {
    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-5-nano"),
      schema: clusterRankingSchema,
      system: [
        "Sos editor de portada de Diario Imparcial.",
        "Tu trabajo es rankear temas periodisticos por relevancia para una portada argentina de interes general.",
        "Priorizá politica, economia, sociedad, seguridad, justicia, servicios, trabajo, salud y deportes con impacto real o alto interes publico.",
        "Penalizá notas de nicho, entretenimiento liviano, curiosidades y contenido de bajo impacto.",
        "Tambien penalizá temas demasiado locales, de marketing corporativo o de bajo interes publico.",
        "Da un relevanceScore de 1 a 10 a cada cluster.",
      ].join(" "),
      prompt,
    })

    const scores = new Map(object.items.map(item => [item.id, item.relevanceScore]))

    return [...dedupedClusters].sort((left, right) => {
      const rightScore = (scores.get(right.id) || 0) * 10 + (heuristicScores.get(right.id) || 0)
      const leftScore = (scores.get(left.id) || 0) * 10 + (heuristicScores.get(left.id) || 0)
      const scoreDifference = rightScore - leftScore
      if (scoreDifference !== 0) return scoreDifference
      if (right.sourcesCount !== left.sourcesCount) return right.sourcesCount - left.sourcesCount
      return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime()
    })
  } catch {
    return [...dedupedClusters].sort((left, right) => {
      const scoreDifference = (heuristicScores.get(right.id) || 0) - (heuristicScores.get(left.id) || 0)
      if (scoreDifference !== 0) return scoreDifference
      return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime()
    })
  }
}
