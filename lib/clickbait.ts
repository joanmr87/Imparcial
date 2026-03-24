import { unstable_cache } from "next/cache"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
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

const clickbaitSelectionSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      include: z.boolean().describe("Si el titulo merece entrar en la seccion"),
      answer: z.string().describe("Respuesta concreta y util para el lector"),
      importanceScore: z.number().min(1).max(10),
      clickbaitScore: z.number().min(1).max(10),
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

  const normalizedTitle = normalizeText(item.title)
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
  return true
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
  const title = normalizeText(item.title)
  const description = item.description.trim()
  if (!description) return null

  if (/\ba cuanto\b|\bcuanto cuesta\b/.test(title)) {
    if (hasPluralPriceCue(title)) return null
    const amountMatch = description.match(/\$\s?\d(?:[\d\.\,\s]*\d)?(?:\s*(mil|millones?))?/i)
    return amountMatch ? amountMatch[0] : null
  }

  if (/\ba que edad\b/.test(title)) {
    const ageMatch = description.match(/\b\d{1,2}\s+años\b/i)
    return ageMatch ? ageMatch[0] : null
  }

  if (/\bdonde\b/.test(title)) {
    const placeMatch = description.match(/\ben\s+(la|el|los|las)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]{3,50}/)
    return placeMatch ? cleanShortAnswer(placeMatch[0]) : null
  }

  if (/^\s*quien\b|^\s*quienes\b|\breemplazante\b/.test(title)) {
    const directCandidate = description.match(/\b(?:a|como)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\b/)
    if (directCandidate) return directCandidate[1]
    return extractCapitalizedName(description)
  }

  if (/\brevelo\b|\bconfirmo\b|\banuncio\b/.test(title)) {
    return extractCapitalizedName(description)
  }

  if (/\bcuales son los \d+\b/.test(title)) {
    const countMatch = item.title.match(/\b(\d+)\b/)
    return countMatch ? `${countMatch[1]} opciones` : null
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

  return categoryWeight * 3 + scorePotentialClickbait(item) - Math.min(freshnessHours, 8) * 0.2
}

async function buildClickbaitBusters(): Promise<ClickbaitBusterItem[]> {
  const { items } = await getLatestFeedSnapshot()
  const candidates = dedupeCandidates(
    items
      .filter(looksLikePotentialClickbait)
      .sort((left, right) => {
        const scoreDifference = scorePotentialClickbait(right) - scorePotentialClickbait(left)
        if (scoreDifference !== 0) return scoreDifference
        return new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime()
      })
      .slice(0, 30)
  )

  if (candidates.length === 0) return []

  const prompt = candidates
    .map((item, index) => [
      `Item ${index + 1}`,
      `ID: ${item.sourceId}:${index}`,
      `Titulo: ${item.title}`,
      `Medio: ${item.source}`,
      `Descripcion: ${item.description || "Sin bajada disponible"}`,
      `URL: ${item.link}`,
    ].join("\n"))
    .join("\n\n---\n\n")

  if (process.env.OPENAI_API_KEY) {
    try {
    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-5-nano"),
      schema: clickbaitSelectionSchema,
      system: [
        "Sos editor de una seccion de Diario Imparcial que detecta y desarma titulares clickbait.",
        "Primero decidis si el titulo realmente oculta un dato concreto que el lector probablemente quiere abrir para conocer.",
        "Solo inclui titulos si la descripcion ya revela esa respuesta de forma suficiente.",
        "Exclui notas de analisis, opinion, coberturas en vivo, listados largos, explicaciones amplias o titulares que ya son informativos por si mismos.",
        "Si inclui un item, responde con el dato concreto que el usuario queria saber.",
        "La respuesta puede ser una palabra, una cifra, un nombre propio o una frase corta de una sola oracion.",
        "No inventes datos. Si la descripcion no alcanza para responder con certeza, include=false.",
        "No uses formulas como 'No lo dice claro'. Si no se puede responder bien, no lo incluyas.",
        "Responde en espanol de Argentina, con tono seco, claro y un poco picante cuando sirva, pero sin hacerse el gracioso porque si.",
        "Si un titular es apenas largo pero no es verdaderamente clickbait, dejalo afuera.",
        "Da importanceScore segun interes general para una audiencia argentina y clickbaitScore segun cuan cebado este el titular.",
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
        totalScore: item.importanceScore * 2 + item.clickbaitScore,
      })
    }

    const selectedItems: Array<ClickbaitBusterItem & { totalScore: number }> = []

    for (const [index, item] of candidates.entries()) {
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

      if (rankedByAi.length > 0) return rankedByAi
    } catch {
      // Fallback below.
    }
  }

  const fallbackItems: ClickbaitBusterItem[] = candidates
    .map((item): (ClickbaitBusterItem & { heuristicScore: number }) | null => {
      const answer = deriveClickbaitFallbackAnswer(item)
      if (!answer || !isValidClickbaitAnswer(answer)) return null

      return {
        id: `${item.sourceId}:${item.link}`,
        title: item.title,
        answer: truncateAnswer(answer),
        source: item.source,
        url: item.link,
        imageUrl: item.imageUrl,
        heuristicScore: heuristicImportanceScore(item),
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
