import { unstable_cache } from "next/cache"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { fetchAllFeeds } from "./rss-fetcher"
import type { RSSItem } from "./types"

export interface ClickbaitBusterItem {
  id: string
  title: string
  answer: string
  source: string
  url: string
  imageUrl?: string
}

const clickbaitAnswerSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      answer: z.string().describe("Respuesta directa, cortita, idealmente de 2 a 8 palabras"),
    })
  ),
})

const BAIT_PATTERNS = [
  /\?/,
  /\bcomo\b/i,
  /\bqué\b/i,
  /\bque\b/i,
  /\bdonde\b/i,
  /\bcu[aá]l\b/i,
  /\ba qu[eé] hora\b/i,
  /\best[ea]\b/i,
  /\bestos\b/i,
  /\besta es\b/i,
  /\besto es\b/i,
  /\bpor qu[eé]\b/i,
  /\btodo sobre\b/i,
  /\bqu[eé] se sabe\b/i,
  /\blo que\b/i,
  /\bse supo\b/i,
]

function stripTrailingNoise(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*Leer más$/i, "")
    .trim()
}

function looksLikeClickbait(title: string): boolean {
  return BAIT_PATTERNS.some(pattern => pattern.test(title))
}

function fallbackAnswer(item: RSSItem): string {
  const sentence = stripTrailingNoise(item.description.split(/[.!?]/)[0] || "")
  if (!sentence) return "No lo dice claro"

  return sentence.length > 90 ? `${sentence.slice(0, 87).trim()}...` : sentence
}

function dedupeCandidates(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>()

  return items.filter(item => {
    const key = item.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function generateAnswers(items: RSSItem[]): Promise<Map<string, string>> {
  if (!process.env.OPENAI_API_KEY || items.length === 0) return new Map()

  const prompt = items
    .map((item, index) => [
      `Item ${index + 1}`,
      `Titulo: ${item.title}`,
      `Medio: ${item.source}`,
      `Descripcion: ${item.description || "Sin bajada disponible"}`,
    ].join("\n"))
    .join("\n\n---\n\n")

  try {
    const { object } = await generateObject({
      model: openai(process.env.OPENAI_MODEL || "gpt-5-nano"),
      schema: clickbaitAnswerSchema,
      system: [
        "Sos editor de una seccion de Diario Imparcial que desarma titulares clickbait.",
        "Tu trabajo es responder cada titulo de manera directa, seca y util.",
        "No inventes datos.",
        "No hagas chistes largos: la gracia sale de responder sin vueltas.",
        "La respuesta debe ser breve, concreta y sonar natural en Argentina.",
        "Si el titulo no puede responderse bien con lo disponible, responde: No lo dice claro.",
      ].join(" "),
      prompt,
    })

    return new Map(object.items.map(item => [item.title, item.answer]))
  } catch {
    return new Map()
  }
}

async function buildClickbaitBusters(): Promise<ClickbaitBusterItem[]> {
  const feedResults = await fetchAllFeeds(["lanacion", "clarin", "tn", "ambito", "cronista", "perfil"])
  const candidates = dedupeCandidates(
    feedResults
      .flatMap(result => result.items)
      .filter(item => looksLikeClickbait(item.title))
      .filter(item => item.imageUrl)
      .slice(0, 12)
  )

  const shortlisted = candidates
    .sort((left, right) => new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime())
    .slice(0, 6)

  const answers = await generateAnswers(shortlisted)

  return shortlisted.map(item => ({
    id: `${item.sourceId}:${item.link}`,
    title: item.title,
    answer: answers.get(item.title) || fallbackAnswer(item),
    source: item.source,
    url: item.link,
    imageUrl: item.imageUrl,
  }))
}

export const getClickbaitBusters = unstable_cache(
  buildClickbaitBusters,
  ["clickbait-busters"],
  { revalidate: 60 * 60 * 6 }
)
