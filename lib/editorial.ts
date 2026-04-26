import { createHash } from "node:crypto"
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

function generateStableArticleSlug(title: string, topic: string, articles: SourceArticleInput[]): string {
  const base = generateSlug(title || topic) || generateSlug(topic) || "nota"
  const fingerprint = createHash("sha1")
    .update(normalizeText(topic))
    .update("|")
    .update(
      [...articles]
        .map(article => `${article.sourceId || article.source}:${article.link}`)
        .sort()
        .join("|")
    )
    .digest("hex")
    .slice(0, 8)

  const trimmedBase = base.slice(0, Math.max(24, 79 - fingerprint.length - 1))
  return `${trimmedBase}-${fingerprint}`
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

function toSentence(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim().replace(/[.;:,\-–\s]+$/g, "")
  if (!clean) return ""
  return /[.!?]$/.test(clean) ? clean : `${clean}.`
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/[^a-z0-9]+/)
      .filter(token => token.length >= 4)
  )
}

function overlapsMeaningfully(left: string, right: string): boolean {
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  if (leftTokens.size === 0 || rightTokens.size === 0) return false

  let shared = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1
  }

  const overlap = shared / Math.min(leftTokens.size, rightTokens.size)
  return overlap >= 0.65
}

function pickDistinctTexts(
  items: Array<{ text: string; source: string }>,
  limit: number,
  excluded: string[] = []
): Array<{ text: string; source: string }> {
  const selected: Array<{ text: string; source: string }> = []
  const blocked = [...excluded]

  for (const item of items) {
    if (!item.text) continue
    if (blocked.some(existing => overlapsMeaningfully(existing, item.text))) continue
    if (selected.some(existing => overlapsMeaningfully(existing.text, item.text))) continue
    selected.push(item)
    blocked.push(item.text)
    if (selected.length >= limit) break
  }

  return selected
}

function extractCoverageFragments(articles: SourceArticleInput[]): Array<{
  text: string
  source: string
}> {
  const seen = new Set<string>()
  const fragments: Array<{ text: string; source: string }> = []

  for (const article of articles) {
    const titleFragment = toSentence(stripHeadlineNoise(article.title))
    if (titleFragment.length >= 35) {
      const normalizedTitle = normalizeText(titleFragment)
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle)
        fragments.push({
          text: clipText(titleFragment, 220),
          source: article.source,
        })
      }
    }

    const parts = article.description
      .split(/(?<=[.!?])\s+/)
      .map(part => toSentence(part))
      .filter(part => part.length >= 35)

    for (const part of parts) {
      const normalized = normalizeText(part)
      if (seen.has(normalized)) continue
      seen.add(normalized)
      fragments.push({
        text: clipText(part, 220),
        source: article.source,
      })
      if (fragments.length >= 12) return fragments
    }
  }

  return fragments
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

function buildFallbackSummary(topic: string, _articles: SourceArticleInput[], fragments: Array<{ text: string; source: string }>): string {
  const selected = pickDistinctTexts(fragments, 2, [stripHeadlineNoise(topic)])
  const opening = selected[0]?.text || toSentence(stripHeadlineNoise(topic))
  const context = selected[1]?.text

  return clipText(
    [
      opening,
      context,
    ]
      .filter(Boolean)
      .join(" "),
    280
  )
}

function fallbackContextLine(category: string): string {
  switch (category) {
    case "Deportes":
      return "El caso impacta de forma directa en la agenda deportiva inmediata, tanto por sus consecuencias competitivas como por lo que deja planteado para las próximas horas."
    case "Economia":
      return "El tema suma impacto inmediato sobre precios, expectativas o decisiones económicas que siguen bajo observación."
    case "Politica":
      return "El episodio agrega un frente político de seguimiento inmediato por sus efectos institucionales y por las reacciones que pueda generar."
    default:
      return "El tema sigue bajo seguimiento por sus efectos inmediatos y por las precisiones oficiales que todavía pueden aparecer."
  }
}

function buildFallbackBodyParagraphs(
  topic: string,
  _articles: SourceArticleInput[],
  fragments: Array<{ text: string; source: string }>,
  category: string,
  summary: string
): string[] {
  const topicLine = toSentence(stripHeadlineNoise(topic))
  const selected = pickDistinctTexts(fragments, 5, [summary])
  const lead = selected[0]?.text || topicLine
  const support = selected[1]?.text
  const context = selected[2]?.text
  const detail = selected[3]?.text
  const close = selected[4]?.text

  const paragraphs = [
    clipText([lead, support].filter(Boolean).join(" "), 360),
    clipText(context || detail || fallbackContextLine(category), 340),
    clipText(detail && detail !== context ? detail : fallbackContextLine(category), 340),
    clipText(close || "La atención queda puesta en las próximas precisiones oficiales y en cómo evolucione el tema a corto plazo.", 340),
  ]

  const distinctParagraphs = pickDistinctTexts(
    paragraphs.map(text => ({ text, source: "sintesis" })),
    4
  ).map(item => item.text)

  const fallbackParagraphs = [
    fallbackContextLine(category),
    "Con el hecho principal ya instalado, el foco pasa ahora por las confirmaciones oficiales y por los efectos concretos que pueda tener en el corto plazo.",
  ]

  for (const paragraph of fallbackParagraphs) {
    if (distinctParagraphs.length >= 4) break
    if (distinctParagraphs.some(existing => overlapsMeaningfully(existing, paragraph))) continue
    distinctParagraphs.push(paragraph)
  }

  return distinctParagraphs.slice(0, 4)
}

function buildFallbackFacts(
  fragments: Array<{ text: string; source: string }>,
  excluded: string[]
): Array<{ text: string; confirmedBy: string[]; status: FactStatus }> {
  return pickDistinctTexts(fragments, 4, excluded).map(fragment => ({
    text: fragment.text,
    confirmedBy: [fragment.source],
    status: "reported",
  }))
}

function buildFallbackAttributedReporting(
  fragments: Array<{ text: string; source: string }>,
  excluded: string[]
): Array<{ source: string; claim: string }> {
  return pickDistinctTexts(fragments, 4, excluded).map(fragment => ({
    source: fragment.source,
    claim: fragment.text.replace(/[.!?]$/, ""),
  }))
}

function pickHeroImage(articles: SourceArticleInput[]): string | undefined {
  return articles.find(article => Boolean(article.imageUrl))?.imageUrl
}

function buildFallbackArticle(topic: string, articles: SourceArticleInput[]): ImpartialArticle {
  const now = new Date().toISOString()
  const fragments = extractCoverageFragments(articles)
  const title = pickFallbackTitle(topic, articles)
  const summary = buildFallbackSummary(topic, articles, fragments)
  const category = inferFallbackCategory(articles)
  const bodyParagraphs = buildFallbackBodyParagraphs(topic, articles, fragments, category, summary)
  const excluded = [summary, ...bodyParagraphs]
  const facts = buildFallbackFacts(fragments, excluded)
  const attributedReporting = buildFallbackAttributedReporting(fragments, [...excluded, ...facts.map(fact => fact.text)])

  return {
    id: crypto.randomUUID(),
    slug: generateStableArticleSlug(title, topic, articles),
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
          slug: generateStableArticleSlug(object.title, topic, articles),
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
