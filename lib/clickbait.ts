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
  if (normalizedTitle.length < 24) return false

  return HINT_PATTERNS.some(pattern => pattern.test(item.title))
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
      .sort((left, right) => new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime())
      .slice(0, 18)
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
        "Responde en espanol de Argentina, con tono seco y claro.",
      ].join(" "),
      prompt,
    })

    const answersById = new Map(
      object.items
        .filter(item => item.include)
        .map(item => [item.id, truncateAnswer(item.answer)])
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    )

    const selectedItems: ClickbaitBusterItem[] = []

    for (const [index, item] of candidates.entries()) {
        const id = `${item.sourceId}:${index}`
        const answer = answersById.get(id)

        if (!answer) continue

        selectedItems.push({
          id: `${item.sourceId}:${item.link}`,
          title: item.title,
          answer,
          source: item.source,
          url: item.link,
          imageUrl: item.imageUrl,
        })
      }

    return selectedItems.slice(0, 6)
  } catch {
    return []
  }
}

export const getClickbaitBusters = unstable_cache(
  buildClickbaitBusters,
  ["clickbait-busters"],
  { revalidate: 60 * 60 * 3 }
)
