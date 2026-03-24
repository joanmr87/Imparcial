import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { NewsCluster } from "./types"

const clusterRankingSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      relevanceScore: z.number().min(1).max(10),
    })
  ),
})

export async function rankClustersByRelevance(clusters: NewsCluster[]): Promise<NewsCluster[]> {
  if (!process.env.OPENAI_API_KEY || clusters.length === 0) return clusters

  const prompt = clusters
    .map((cluster, index) => [
      `Cluster ${index + 1}`,
      `ID: ${cluster.id}`,
      `Tema: ${cluster.topic}`,
      `Titulo canonico: ${cluster.canonicalTitle}`,
      `Fuentes distintas: ${cluster.sourcesCount}`,
      `Ultima publicacion: ${cluster.lastPublishedAt}`,
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

    return [...clusters].sort((left, right) => {
      const scoreDifference = (scores.get(right.id) || 0) - (scores.get(left.id) || 0)
      if (scoreDifference !== 0) return scoreDifference
      if (right.sourcesCount !== left.sourcesCount) return right.sourcesCount - left.sourcesCount
      return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime()
    })
  } catch {
    return clusters
  }
}
