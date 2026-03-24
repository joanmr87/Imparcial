import { unstable_cache } from "next/cache"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getLatestFeedSnapshot } from "./feed-store"
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

  if (candidates.length === 0 || !process.env.OPENAI_API_KEY) return []

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

    return selectedItems
      .sort((left, right) => right.totalScore - left.totalScore)
      .slice(0, 6)
      .map(({ totalScore: _totalScore, ...item }) => item)
  } catch {
    return []
  }
}

export const getClickbaitBusters = unstable_cache(
  buildClickbaitBusters,
  ["clickbait-busters"],
  { revalidate: 60 * 60 * 3 }
)
