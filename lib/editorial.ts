import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { ArticleStatus, FactStatus, ImpartialArticle, SourceArticleInput } from "./types"

const editorialSchema = z.object({
  title: z.string().describe("Titulo neutral y descriptivo"),
  summary: z.string().describe("Resumen de 2 a 3 oraciones, sin opinion ni adjetivos valorativos"),
  category: z.string().describe("Categoria periodistica principal"),
  bodyParagraphs: z.array(
    z.string().describe("Parrafo breve y claro para una lectura fluida, con tono periodistico neutral")
  ).min(3).max(6),
  facts: z.array(
    z.object({
      text: z.string().describe("Hecho puntual redactado de forma neutral"),
      confirmedBy: z.array(z.string()).describe("Fuentes que sostienen o reportan este hecho"),
      status: z.enum(["confirmed", "reported", "disputed", "developing"]).describe("Nivel de certeza del hecho"),
    })
  ).min(3).max(8),
  attributedReporting: z.array(
    z.object({
      source: z.string().describe("Nombre del medio"),
      claim: z.string().describe("Dato o enfoque atribuido expresamente a esa fuente"),
    })
  ).min(2).max(8),
  discrepancies: z.array(
    z.object({
      topic: z.string().describe("Aspecto en el que las fuentes difieren"),
      claims: z.array(
        z.object({
          source: z.string().describe("Nombre del medio"),
          claim: z.string().describe("Version atribuida a ese medio"),
        })
      ).min(2),
    })
  ).max(5),
})

const SYSTEM_PROMPT = `Eres el editor de Diario Imparcial, un diario digital argentino hecho con IA.

Tu trabajo es combinar coberturas de varios medios sobre el mismo hecho y producir una nota nueva, legible y estrictamente neutral.

Reglas obligatorias:
- No inventes datos.
- No uses adjetivos valorativos ni lenguaje de opinion.
- Atribuye con claridad lo que no este confirmado por varias fuentes.
- Si hay contradicciones, muestralas sin resolverlas por cuenta propia.
- Prioriza hechos concretos, fechas, numeros, nombres propios y consecuencias verificables.
- El titulo debe sonar periodistico, no promocional.
- El resumen debe poder publicarse tal cual en portada.
- Usa categorias periodisticas habituales en Argentina.
- La lectura debe sentirse clara, ordenada y humana, no como un acta tecnica.
- Abre con 3 a 6 parrafos cortos que expliquen rapidamente que paso, quien intervino y por que importa hoy.
- Evita repetir formulas como "segun" al inicio de todas las oraciones; alterna estructuras pero manteniendo la atribucion cuando haga falta.
- Si una fuente aporta contexto y otra aporta el hecho puntual, integralos sin perder trazabilidad.
- No conviertas toda la nota en listas: usa listas solo para hechos confirmados y discrepancias.
`

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80)
}

function determineStatus(facts: Array<{ status: FactStatus }>): ArticleStatus {
  if (facts.some(fact => fact.status === "disputed")) return "disputed"
  if (facts.some(fact => fact.status === "developing" || fact.status === "reported")) {
    return "developing"
  }

  return "confirmed"
}

function buildContent(article: z.infer<typeof editorialSchema>): string {
  const sections: string[] = []

  sections.push(article.bodyParagraphs.join("\n\n"))
  sections.push("**Hechos confirmados o reportados por las fuentes:**")
  sections.push(article.facts.map(fact => `- ${fact.text}`).join("\n"))

  sections.push("**Informacion atribuida:**")
  sections.push(
    article.attributedReporting
      .map(item => `${item.source}: ${item.claim}.`)
      .join("\n\n")
  )

  if (article.discrepancies.length > 0) {
    sections.push("**Puntos de discrepancia:**")
    sections.push(
      article.discrepancies
        .map(discrepancy => {
          const claims = discrepancy.claims
            .map(claim => `- ${claim.source}: ${claim.claim}`)
            .join("\n")

          return `${discrepancy.topic}\n${claims}`
        })
        .join("\n\n")
    )
  }

  return sections.join("\n\n")
}

export async function generateImpartialArticle(
  topic: string,
  articles: SourceArticleInput[]
): Promise<{
  article: ImpartialArticle
  usage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const modelId = process.env.OPENAI_MODEL || "gpt-5-nano"
  const formattedSources = articles
    .map((article, index) => {
      return [
        `Fuente ${index + 1}: ${article.source}`,
        `Titulo: ${article.title}`,
        `Descripcion: ${article.description || "Sin descripcion disponible"}`,
        `Publicado: ${article.pubDate}`,
        `URL: ${article.link}`,
      ].join("\n")
    })
    .join("\n\n---\n\n")

  const { object, usage } = await generateObject({
    model: openai(modelId),
    schema: editorialSchema,
    schemaName: "impartial_article",
    system: SYSTEM_PROMPT,
    prompt: [
      `Tema detectado: ${topic}`,
      "",
      `Fuentes disponibles: ${articles.length}`,
      "",
      formattedSources,
    ].join("\n"),
  })

  const now = new Date().toISOString()
  const facts = object.facts.map(fact => ({
    text: fact.text,
    confirmedBy: fact.confirmedBy,
    status: fact.status,
  }))

  return {
    article: {
      id: crypto.randomUUID(),
      slug: generateSlug(object.title),
      title: object.title,
      summary: object.summary,
      content: buildContent(object),
      facts,
      discrepancies: object.discrepancies,
      sources: articles.map((article, index) => ({
        id: `source-${index + 1}`,
        name: article.source,
        url: article.link,
        publishedAt: article.pubDate,
        title: article.title,
        snippet: article.description.slice(0, 180),
      })),
      sourceCount: new Set(articles.map(article => article.sourceId || article.source)).size,
      articleCount: articles.length,
      category: object.category,
      createdAt: now,
      updatedAt: now,
      status: determineStatus(facts),
    },
    usage: {
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    },
  }
}
