import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { inferCategoryFromItem } from "./news-categories"
import type { ArticleStatus, FactStatus, ImpartialArticle, SourceArticleInput } from "./types"

const editorialSchema = z.object({
  title: z.string().describe("Titulo neutral y descriptivo"),
  summary: z.string().describe("Resumen de 2 a 3 oraciones, sin opinion ni adjetivos valorativos"),
  category: z.string().describe("Categoria periodistica principal"),
  bodyParagraphs: z.array(
    z.string().describe("Parrafo breve y claro para una lectura fluida, con tono periodistico neutral")
  ).min(4).max(8),
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

Tu trabajo es combinar coberturas de varios medios sobre el mismo hecho y producir una sintesis periodistica legible y estrictamente neutral.

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
- Escribe para lectores argentinos que quieren entender rapido que paso, sin jerga innecesaria ni vueltas.
- Abre con 4 a 8 parrafos cortos que expliquen rapidamente que paso, quien intervino, que contexto hace falta y por que importa hoy.
- Si aplica, suma un parrafo de antecedentes inmediatos y otro con el estado actual del tema.
- En deportes, incluye torneo o competencia, instancia, protagonistas, impacto deportivo inmediato y proximo hito relevante.
- Evita repetir formulas como "segun" al inicio de todas las oraciones; alterna estructuras pero manteniendo la atribucion cuando haga falta.
- Si una fuente aporta contexto y otra aporta el hecho puntual, integralos sin perder trazabilidad.
- No conviertas toda la nota en listas: usa listas solo para hechos confirmados y discrepancias.
- Si el tema afecta bolsillo, servicios, politica, seguridad, trabajo o vida cotidiana, deja claro por que importa en Argentina.
- No menciones el proceso interno de generacion del diario dentro del cuerpo de la nota.
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
  sections.push("**Claves del hecho**")
  sections.push(article.facts.map(fact => `- ${fact.text}`).join("\n"))

  sections.push("**Lo que aportan las coberturas**")
  sections.push(
    article.attributedReporting
      .map(item => `${item.source}: ${item.claim}.`)
      .join("\n\n")
  )

  if (article.discrepancies.length > 0) {
    sections.push("**Versiones que siguen abiertas**")
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

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function stripHeadlineNoise(title: string): string {
  return title
    .replace(/\s+\|\s+.*$/g, "")
    .replace(/^en vivo:\s*/i, "")
    .replace(/^ultima? momento:\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function clipText(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`
}

function extractDescriptionSentences(articles: SourceArticleInput[]): Array<{
  text: string
  source: string
}> {
  const seen = new Set<string>()
  const sentences: Array<{ text: string; source: string }> = []

  for (const article of articles) {
    const parts = article.description
      .split(/(?<=[.!?])\s+/)
      .map(part => part.trim())
      .filter(part => part.length >= 35)

    for (const part of parts) {
      const normalized = normalizeText(part)
      if (seen.has(normalized)) continue
      seen.add(normalized)
      sentences.push({
        text: clipText(part, 220),
        source: article.source,
      })
      if (sentences.length >= 8) return sentences
    }
  }

  return sentences
}

function pickFallbackTitle(topic: string, articles: SourceArticleInput[]): string {
  const candidates = articles
    .map(article => stripHeadlineNoise(article.title))
    .filter(title => title.length >= 20 && !title.includes("?"))
    .sort((left, right) => right.length - left.length)

  return clipText(candidates[0] || stripHeadlineNoise(topic), 110)
}

function inferFallbackCategory(articles: SourceArticleInput[]): string {
  const counts = new Map<string, number>()

  for (const article of articles) {
    const category = inferCategoryFromItem({
      ...article,
      sourceId: article.sourceId || article.source,
    })
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "Sociedad"
}

function buildFallbackSummary(topic: string, _articles: SourceArticleInput[], sentences: Array<{ text: string; source: string }>): string {
  const opening = sentences[0]?.text || stripHeadlineNoise(topic)
  const context = sentences[1]?.text

  return clipText(
    [
      opening,
      context,
      sentences[2]?.text,
    ]
      .filter(Boolean)
      .join(" "),
    320
  )
}

function buildFallbackBodyParagraphs(topic: string, _articles: SourceArticleInput[], sentences: Array<{ text: string; source: string }>): string[] {
  const topicLine = stripHeadlineNoise(topic)
  const sentencePool = sentences.map(sentence => sentence.text)
  const paragraphs = [
    sentencePool[0] || topicLine,
    sentencePool[1]
      ? `${topicLine}. ${sentencePool[1]}`
      : sentencePool[0] || `Las distintas coberturas coinciden en los puntos centrales de ${topicLine.toLowerCase()}.`,
    sentencePool[2]
      ? sentencePool[2]
      : `El desarrollo del tema mantiene impacto en Argentina por sus efectos inmediatos y por las decisiones que siguen en curso.`,
    sentencePool[3]
      ? sentencePool[3]
      : sentencePool[1] || `Todavía quedan aspectos bajo seguimiento mientras aparecen nuevas precisiones en las coberturas.`,
  ]

  return paragraphs
    .filter(Boolean)
    .map(paragraph => clipText(paragraph, 340))
}

function buildFallbackFacts(
  sentences: Array<{ text: string; source: string }>
): Array<{ text: string; confirmedBy: string[]; status: FactStatus }> {
  return sentences.slice(0, 4).map(sentence => ({
    text: sentence.text,
    confirmedBy: [sentence.source],
    status: "reported",
  }))
}

function buildFallbackAttributedReporting(
  sentences: Array<{ text: string; source: string }>
): Array<{ source: string; claim: string }> {
  return sentences.slice(0, 4).map(sentence => ({
    source: sentence.source,
    claim: sentence.text,
  }))
}

function pickHeroImage(articles: SourceArticleInput[]): string | undefined {
  return articles.find(article => Boolean(article.imageUrl))?.imageUrl
}

function buildFallbackArticle(topic: string, articles: SourceArticleInput[]): ImpartialArticle {
  const now = new Date().toISOString()
  const sentences = extractDescriptionSentences(articles)
  const title = pickFallbackTitle(topic, articles)
  const summary = buildFallbackSummary(topic, articles, sentences)
  const category = inferFallbackCategory(articles)
  const bodyParagraphs = buildFallbackBodyParagraphs(topic, articles, sentences)
  const facts = buildFallbackFacts(sentences)
  const attributedReporting = buildFallbackAttributedReporting(sentences)

  return {
    id: crypto.randomUUID(),
    slug: generateSlug(title),
    title,
    summary,
    content: buildContent({
      title,
      summary,
      category,
      bodyParagraphs,
      facts,
      attributedReporting,
      discrepancies: [],
    }),
    heroImageUrl: pickHeroImage(articles),
    facts,
    discrepancies: [],
    sources: articles.map((article, index) => ({
      id: `source-${index + 1}`,
      name: article.source,
      url: article.link,
      publishedAt: article.pubDate,
      title: article.title,
      snippet: clipText(article.description, 180),
    })),
    sourceCount: new Set(articles.map(article => article.sourceId || article.source)).size,
    articleCount: articles.length,
    category,
    createdAt: now,
    updatedAt: now,
    status: determineStatus(facts),
  }
}

export async function generateImpartialArticle(
  topic: string,
  articles: SourceArticleInput[],
  options: {
    useAi?: boolean
  } = {}
): Promise<{
  article: ImpartialArticle
  usage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}> {
  const { useAi = true } = options

  if (useAi && process.env.OPENAI_API_KEY) {
    try {
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
          heroImageUrl: pickHeroImage(articles),
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
    } catch {
      // Fall back to deterministic synthesis below.
    }
  }

  return {
    article: buildFallbackArticle(topic, articles),
    usage: {},
  }
}
