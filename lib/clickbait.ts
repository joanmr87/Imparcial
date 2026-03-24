import { unstable_cache } from "next/cache"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { load } from "cheerio"
import { z } from "zod"
import { getLatestFeedSnapshot } from "./feed-store"
import { inferCategoryFromItem } from "./news-categories"
import type { RSSItem } from "./types"

export interface ClickbaitBusterItem {
  id: string
  title: string
  answer: string
  source: string
  url: string
  imageUrl?: string
}

interface ClickbaitCandidate extends RSSItem {
  articleContext: string
}

const clickbaitSelectionSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      include: z.boolean().describe("Si el titulo merece entrar en la seccion"),
      answer: z.string().describe("Respuesta concreta y util para el lector"),
      importanceScore: z.number().min(1).max(10),
      clickbaitScore: z.number().min(1).max(10),
      confidenceScore: z.number().min(1).max(10),
    })
  ),
})

const HINT_PATTERNS = [
  /\?/,
  /^\s*qu[eé]n\b/i,
  /^\s*qu[eé]\b/i,
  /^\s*cu[aá]l/i,
  /^\s*cu[aá]les/i,
  /^\s*d[oó]nde/i,
  /^\s*cu[aá]nto/i,
  /^\s*a qu[eé]/i,
  /\brevel[oó]\b/i,
  /\bconfirm[oó]\b/i,
  /\banunci[oó]\b/i,
  /\bla citaci[oó]n\b/i,
  /\bqui[eé]n ser[aá]\b/i,
]

const REJECT_PATTERNS = [
  /\ben vivo\b/i,
  /\bminuto a minuto\b/i,
  /\bultimas noticias\b/i,
  /\btodo sobre\b/i,
  /\bgu[ií]a\b/i,
  /\bopini[oó]n\b/i,
  /\ban[aá]lisis\b/i,
  /\bcolumna\b/i,
]

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function looksLikePotentialClickbait(item: RSSItem): boolean {
  if (!item.imageUrl || !item.description.trim()) return false
  if (REJECT_PATTERNS.some(pattern => pattern.test(item.title))) return false

  const normalizedTitle = normalizeText(`${item.title} ${item.description} ${item.link}`)
  if (/\b(mexico|usa|estados unidos|\/mexico\/|\/usa\/)\b/.test(normalizedTitle) && !/\bargentina\b/.test(normalizedTitle)) {
    return false
  }

  return normalizedTitle.length >= 18
}

function scorePotentialClickbait(item: RSSItem): number {
  let score = 0

  if (HINT_PATTERNS.some(pattern => pattern.test(item.title))) score += 5
  if (/\bsecret[oa]s?\b/i.test(item.title)) score += 2
  if (/\bque\b/i.test(item.title)) score += 1
  if (/\bcual\b/i.test(item.title)) score += 1
  if (/\bquien\b/i.test(item.title)) score += 1
  if (/\bdonde\b/i.test(item.title)) score += 1
  if (/\bcuanto\b/i.test(item.title)) score += 1

  return score
}

function dedupeCandidates(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>()

  return items.filter(item => {
    const key = normalizeText(item.title).replace(/\s+/g, " ").trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function cleanContextFragment(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .trim()
}

function pushUniqueFragment(fragments: string[], seen: Set<string>, value?: string | null, minLength = 30) {
  const clean = cleanContextFragment(value || "")
  if (clean.length < minLength) return

  const normalized = normalizeText(clean)
  if (seen.has(normalized)) return
  seen.add(normalized)
  fragments.push(clean)
}

function collectStructuredText(value: unknown, fragments: string[], seen: Set<string>) {
  if (!value) return

  if (typeof value === "string") {
    pushUniqueFragment(fragments, seen, value)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStructuredText(item, fragments, seen)
    }
    return
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>
    for (const key of ["headline", "description", "articleBody", "text", "name"]) {
      collectStructuredText(objectValue[key], fragments, seen)
    }
  }
}

export function extractArticleContextFromHtml(html: string): string {
  const $ = load(html)
  const fragments: string[] = []
  const seen = new Set<string>()

  pushUniqueFragment(fragments, seen, $("meta[property='og:description']").attr("content"))
  pushUniqueFragment(fragments, seen, $("meta[name='description']").attr("content"))

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).text().trim()
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      collectStructuredText(parsed, fragments, seen)
    } catch {
      // Ignore malformed structured data.
    }
  })

  $("article p, main p, p").slice(0, 18).each((_, element) => {
    pushUniqueFragment(fragments, seen, $(element).text())
  })

  $("article li, main li, li").slice(0, 12).each((_, element) => {
    pushUniqueFragment(fragments, seen, $(element).text(), 6)
  })

  return fragments.slice(0, 10).join(" ")
}

async function fetchArticleContext(item: RSSItem): Promise<ClickbaitCandidate> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetch(item.link, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "DiarioImparcial/1.0 (+https://v0-ai-news-verification-ten.vercel.app)",
          "Accept": "text/html,application/xhtml+xml",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
      const articleContext = extractArticleContextFromHtml(html)

      return {
        ...item,
        articleContext: articleContext || item.description,
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch {
    return {
      ...item,
      articleContext: item.description,
    }
  }
}

function truncateAnswer(answer: string): string {
  return answer
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim()
    .slice(0, 120)
}

function hasPluralPriceCue(title: string): boolean {
  return /\bcuanto cuesta\b/.test(title) && /\b(los|las|unos|unas|colegios|autos|departamentos|celulares)\b/.test(title)
}

function isValidClickbaitAnswer(answer: string): boolean {
  const clean = answer.trim()
  if (clean.length < 3) return false
  if (/^\$\s?\d{1,2}$/.test(clean)) return false
  if (/^(no se sabe|sin datos|en vivo)$/i.test(clean)) return false
  if (/^(el gobierno|en estados unidos|en mexico|en uruguay)$/i.test(clean)) return false
  return true
}

function normalizeResolvedAnswer(answer: string | null): string | null {
  if (!answer) return null
  return isValidClickbaitAnswer(answer) ? answer : null
}

function extractCapitalizedName(description: string): string | null {
  const match = description.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\b/)
  return match ? match[1] : null
}

function cleanShortAnswer(answer: string): string {
  return answer
    .split(/\b(si|cuando|mientras|porque)\b/i)[0]
    .split(/[.,;:]/)[0]
    .trim()
}

export function deriveClickbaitFallbackAnswer(item: RSSItem): string | null {
  return deriveClickbaitFallbackAnswerFromContext(item, "")
}

function extractNameList(text: string, maxItems = 5): string | null {
  const matches = text.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2}\b/g)
  if (!matches) return null

  const names = [...new Set(matches)]
    .filter(name => name.split(" ").every(part => part.length > 2))
    .slice(0, maxItems)

  return names.length >= 2 ? names.join(", ") : null
}

function deriveClickbaitFallbackAnswerFromContext(item: RSSItem, extraContext: string): string | null {
  const title = normalizeText(item.title)
  const context = `${item.description.trim()} ${extraContext.trim()}`.trim()
  if (!context) return null

  if (/\ba cuanto\b|\bcuanto cuesta\b/.test(title)) {
    if (hasPluralPriceCue(title)) return null
    const amountMatch = context.match(/\$\s?\d(?:[\d\.\,\s]*\d)?(?:\s*(mil|millones?))?/i)
    return normalizeResolvedAnswer(amountMatch ? amountMatch[0] : null)
  }

  if (/\binflacion\b/.test(title)) {
    const percentMatch = context.match(/\b\d{1,2}(?:[.,]\d)?\s?%/i)
    return normalizeResolvedAnswer(percentMatch ? `aprox. ${percentMatch[0].replace(/\s+/g, "")}` : null)
  }

  if (/\ba que edad\b/.test(title)) {
    const ageMatch = context.match(/\b\d{1,2}\s+años\b/i)
    return normalizeResolvedAnswer(ageMatch ? ageMatch[0] : null)
  }

  if (/\bdonde\b/.test(title)) {
    const placeMatch = context.match(/\ben\s+(la|el|los|las)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]{3,50}/)
    return normalizeResolvedAnswer(placeMatch ? cleanShortAnswer(placeMatch[0]) : null)
  }

  if (/\bcalor\b|\btemperatura\b|\bmeteorologic/.test(title)) {
    const tempMatches = [...context.matchAll(/\b(\d{2})\s?°/g)].map(match => Number(match[1]))
    if (tempMatches.length > 0) {
      return normalizeResolvedAnswer(`hasta ${Math.max(...tempMatches)}°`)
    }
  }

  if (/\bcitacion\b|\bconvocad\b|\blista\b/.test(title)) {
    return normalizeResolvedAnswer(extractNameList(context, 6))
  }

  if (/^\s*quien\b|^\s*quienes\b|\breemplazante\b/.test(title)) {
    const directCandidate = context.match(/\b(?:a|como)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\b/)
    if (directCandidate) return normalizeResolvedAnswer(directCandidate[1])
    return normalizeResolvedAnswer(extractCapitalizedName(context))
  }

  if (/\brevelo\b|\bconfirmo\b|\banuncio\b/.test(title)) {
    return normalizeResolvedAnswer(extractCapitalizedName(context))
  }

  if (/\bcuales son los \d+\b/.test(title)) {
    const extractedNames = extractNameList(context, 6)
    if (extractedNames) return normalizeResolvedAnswer(extractedNames)

    const countMatch = item.title.match(/\b(\d+)\b/)
    return normalizeResolvedAnswer(countMatch ? `${countMatch[1]} opciones` : null)
  }

  return null
}

function heuristicImportanceScore(item: RSSItem): number {
  const category = inferCategoryFromItem(item)
  const categoryWeight = {
    Politica: 4,
    Economia: 4,
    Sociedad: 3,
    Deportes: 3,
    Internacional: 2,
  }[category] || 1

  const freshnessHours = Math.max(
    0,
    (Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60 * 60)
  )
  const text = normalizeText(`${item.title} ${item.description} ${item.link}`)
  const foreignPenalty =
    /\b(mexico|estados unidos|usa|texas|uruguay|europa|the economist)\b/.test(text) &&
    !/\b(argentina|amba|buenos aires|milei|scaloni|seleccion argentina)\b/.test(text)
      ? 8
      : 0

  return categoryWeight * 3 + scorePotentialClickbait(item) - Math.min(freshnessHours, 8) * 0.2 - foreignPenalty
}

async function buildClickbaitBusters(): Promise<ClickbaitBusterItem[]> {
  const { items } = await getLatestFeedSnapshot()
  const candidatePool = dedupeCandidates(
    items
      .filter(looksLikePotentialClickbait)
      .sort((left, right) => {
        const scoreDifference = scorePotentialClickbait(right) - scorePotentialClickbait(left)
        if (scoreDifference !== 0) return scoreDifference
        return new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime()
      })
      .slice(0, 40)
  )

  if (candidatePool.length === 0) return []

  const enrichedCandidates = await Promise.all(
    candidatePool.slice(0, 14).map(item => fetchArticleContext(item))
  )

  const prompt = enrichedCandidates
    .map((item, index) => [
      `Item ${index + 1}`,
      `ID: ${item.sourceId}:${index}`,
      `Titulo: ${item.title}`,
      `Medio: ${item.source}`,
      `Descripcion: ${item.description || "Sin bajada disponible"}`,
      `Contexto extraido: ${item.articleContext || "Sin contexto extraido"}`,
      `URL: ${item.link}`,
    ].join("\n"))
    .join("\n\n---\n\n")

  if (process.env.OPENAI_API_KEY) {
    try {
    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-5-nano"),
      schema: clickbaitSelectionSchema,
      system: [
        "Sos editor de la seccion Te ahorramos el click de Diario Imparcial.",
        "Tu trabajo es detectar titulares anzuelo que esconden un dato concreto y devolver exactamente ese dato de forma corta, filosa y util.",
        "Esto aplica a nombres, convocados, listas, fechas, horarios, lugares, cifras, temperaturas, porcentajes o cualquier dato que el lector tuvo que abrir para encontrar.",
        "No te interesa si el titulo es largo: solo entra si oculta una respuesta concreta.",
        "Exclui analisis, opinion, vivos, cronicas amplias, rankings sin respuesta clara o temas donde la nota no resuelve de verdad la pregunta.",
        "Si la respuesta es una lista, devolvela como lista compacta separada por comas.",
        "Si es un pronostico, devolvelo tipo 'hasta 39°' o 'llueve el jueves'.",
        "Si es una cifra estimada, devolvela tipo 'aprox. 4%'.",
        "Si es una convocatoria o citacion, devolve solo los nombres.",
        "Priorizá temas de Argentina o de impacto directo para lectores argentinos. Dejá afuera notas extranjeras sin relevancia local clara.",
        "No inventes. Si el contexto no permite una respuesta clara, include=false.",
        "No uses frases vagas como 'No lo dice claro', 'depende' o 'hay que leer la nota'.",
        "Escribi en espanol de Argentina. La respuesta tiene que poder entrar en una card.",
        "Ejemplos de criterio: 'Cuales son los 10 autos...' => lista de autos. 'La citacion...' => nombres convocados. 'Hasta que punto podria llegar la inflacion...' => aprox. con numero. 'Hasta cuando sigue la ola de calor...' => temperatura o dia clave. 'Sorpresa en musica argentina...' => nombre propio.",
        "Da importanceScore segun interes general para una audiencia argentina, clickbaitScore segun cuan cebado este el titular y confidenceScore segun cuan bien respaldada queda la respuesta en el contexto.",
      ].join(" "),
      prompt,
    })

    const answersById = new Map<string, { answer: string; totalScore: number }>()

    for (const item of object.items) {
      if (!item.include) continue

      const answer = truncateAnswer(item.answer)
      if (!answer) continue

      answersById.set(item.id, {
        answer,
        totalScore: item.importanceScore * 2 + item.clickbaitScore + item.confidenceScore,
      })
    }

    const selectedItems: Array<ClickbaitBusterItem & { totalScore: number }> = []

    for (const [index, item] of enrichedCandidates.entries()) {
      const id = `${item.sourceId}:${index}`
      const ranked = answersById.get(id)

      if (!ranked) continue

      selectedItems.push({
        id: `${item.sourceId}:${item.link}`,
        title: item.title,
        answer: ranked.answer,
        source: item.source,
        url: item.link,
        imageUrl: item.imageUrl,
        totalScore: ranked.totalScore,
      })
    }

    const rankedByAi = selectedItems
      .sort((left, right) => right.totalScore - left.totalScore)
      .slice(0, 6)
      .map(({ totalScore: _totalScore, ...item }) => item)

      if (rankedByAi.length >= 3) return rankedByAi

      if (rankedByAi.length > 0) {
        const fallbackItems = buildFallbackItems(enrichedCandidates)
        const merged = [...rankedByAi]

        for (const fallbackItem of fallbackItems) {
          if (merged.some(item => item.id === fallbackItem.id)) continue
          merged.push(fallbackItem)
          if (merged.length >= 3) break
        }

        if (merged.length > 0) return merged.slice(0, 6)
      }
    } catch {
      // Fallback below.
    }
  }

  return buildFallbackItems(enrichedCandidates)
}

function buildFallbackItems(candidates: ClickbaitCandidate[]): ClickbaitBusterItem[] {
  const fallbackItems: ClickbaitBusterItem[] = candidates
    .map((item): (ClickbaitBusterItem & { heuristicScore: number }) | null => {
      const answer = deriveClickbaitFallbackAnswerFromContext(item, item.articleContext)
      if (!answer || !isValidClickbaitAnswer(answer)) return null
      const heuristicScore = heuristicImportanceScore(item)
      if (heuristicScore < 6) return null

      return {
        id: `${item.sourceId}:${item.link}`,
        title: item.title,
        answer: truncateAnswer(answer),
        source: item.source,
        url: item.link,
        imageUrl: item.imageUrl,
        heuristicScore,
      }
    })
    .filter((item): item is ClickbaitBusterItem & { heuristicScore: number } => item !== null)
    .sort((left, right) => right.heuristicScore - left.heuristicScore)
    .slice(0, 6)
    .map(({ heuristicScore: _heuristicScore, ...item }) => item)

  return fallbackItems
}

export const getClickbaitBusters = unstable_cache(
  buildClickbaitBusters,
  ["clickbait-busters-v2"],
  { revalidate: 60 * 30 }
)
