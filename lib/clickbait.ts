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

const MAX_ANSWER_WORDS = 6

const clickbaitAnswerSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      include: z.boolean().describe("Si este titulo merece entrar en la seccion"),
      answer: z.string().describe("Respuesta directa de 1 a 6 palabras"),
    })
  ),
})

const DIRECT_BAIT_PATTERNS = [
  /\?/,
  /^\s*qu[eé]n\b/i,
  /^\s*qu[eé]\b/i,
  /^\s*cu[aá]l/i,
  /^\s*cu[aá]les/i,
  /^\s*d[oó]nde/i,
  /^\s*hasta qu[eé]/i,
  /\ba qu[eé]\b/i,
  /\ba qu[eé] edad\b/i,
  /\bcu[aá]nto\b/i,
  /\bcu[aá]ntos\b/i,
  /\bdonde\b/i,
  /\brevel[oó]\b/i,
  /\bqu[eé] se sabe\b/i,
  /\bqui[eé]n ser[aá]\b/i,
  /\bqui[eé]nes\b/i,
]

const WITHHELD_ANSWER_PATTERNS = [
  /\brevel[oó]\b.*\ba qui[eé]n(?:es)?\b/i,
  /\bla citaci[oó]n\b.*\b(realiz[oó]|hizo|confirm[oó]|anunci[oó])\b/i,
  /\bel llamado\b.*\b(realiz[oó]|hizo|confirm[oó]|anunci[oó])\b/i,
  /\bqu[eé] decisi[oó]n\b/i,
  /\bel dato\b.*\bque\b/i,
]

const REJECT_PATTERNS = [
  /\ben vivo\b/i,
  /\bminuto a minuto\b/i,
  /\bultimas noticias\b/i,
  /\btodo sobre\b/i,
  /\bhoy\b.*\ben vivo\b/i,
  /\bgu[ií]a\b/i,
  /\bconsejos\b/i,
  /\bclaves\b/i,
  /\bcuidados\b/i,
  /\brutinas\b/i,
  /\bpaso a paso\b/i,
  /\blista\b/i,
  /\branking\b/i,
  /\btop\s+\d+\b/i,
  /\blos\s+\d+\b/i,
]

function stripTrailingNoise(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*Leer más$/i, "")
    .trim()
}

function looksLikeClickbait(title: string): boolean {
  if (REJECT_PATTERNS.some(pattern => pattern.test(title))) return false
  return DIRECT_BAIT_PATTERNS.some(pattern => pattern.test(title))
    || WITHHELD_ANSWER_PATTERNS.some(pattern => pattern.test(title))
}

function fallbackAnswer(item: RSSItem): string {
  const shortSentence = stripTrailingNoise(item.description.split(/[.!?]/)[0] || "")
  if (!shortSentence) return ""
  return "No lo dice claro"
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

function normalizeAnswer(answer: string): string {
  return answer
    .replace(/\.\.\.+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isCompactAnswer(answer: string): boolean {
  const normalized = normalizeAnswer(answer)
  if (!normalized) return false
  if (normalized.length > 40) return false

  const words = normalized.split(/\s+/).filter(Boolean)
  return words.length > 0 && words.length <= MAX_ANSWER_WORDS
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
        "Solo deben entrar titulos cuya pregunta oculta pueda responderse en 1 a 6 palabras.",
        "Si el titulo exige una lista larga, una explicacion amplia, una guia, un vivo o un analisis, debe quedar afuera.",
        "Tu trabajo es responder cada titulo de manera directa, seca y util.",
        "No inventes datos.",
        "No hagas chistes largos: la gracia sale de responder sin vueltas.",
        "La respuesta debe ser breve, concreta, sonar natural en Argentina y nunca superar 6 palabras.",
        "Preferi respuestas como: 'En la Bombonera', 'A los 7 años', 'Brey', 'No lo dice claro'.",
        "No escribas oraciones completas.",
        "Si la descripcion no resuelve claramente la incognita, marca include=false.",
      ].join(" "),
      prompt,
    })

    return new Map(
      object.items
        .filter(item => item.include)
        .map(item => [item.title, normalizeAnswer(item.answer)])
    )
  } catch {
    return new Map()
  }
}

function scoreCandidate(item: RSSItem): number {
  const title = item.title
  let score = 0

  if (/^\s*qu[eé]n\b/i.test(title)) score += 4
  if (/^\s*d[oó]nde\b/i.test(title)) score += 4
  if (/^\s*cu[aá]les\b/i.test(title)) score += 4
  if (/\ba qu[eé] edad\b/i.test(title)) score += 4
  if (/\bqu[eé] se sabe\b/i.test(title)) score += 3
  if (/\brevel[oó]\b/i.test(title)) score += 3
  if (WITHHELD_ANSWER_PATTERNS.some(pattern => pattern.test(title))) score += 3
  if (/\?/i.test(title)) score += 2
  if (/\bqu[eé]\b/i.test(title)) score += 1
  if (!item.description) score -= 2
  if (REJECT_PATTERNS.some(pattern => pattern.test(title))) score -= 10

  return score
}

async function buildClickbaitBusters(): Promise<ClickbaitBusterItem[]> {
  const feedResults = await fetchAllFeeds(["lanacion", "clarin", "tn", "ambito", "cronista", "perfil"])
  const candidates = dedupeCandidates(
    feedResults
      .flatMap(result => result.items)
      .filter(item => looksLikeClickbait(item.title))
      .filter(item => item.imageUrl)
      .sort((left, right) => {
        const scoreDifference = scoreCandidate(right) - scoreCandidate(left)
        if (scoreDifference !== 0) return scoreDifference
        return new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime()
      })
      .slice(0, 14)
  )

  const shortlisted = candidates
    .slice(0, 8)

  const answers = await generateAnswers(shortlisted)

  return shortlisted
    .map(item => {
      const answer = normalizeAnswer(answers.get(item.title) || fallbackAnswer(item))
      return {
        id: `${item.sourceId}:${item.link}`,
        title: item.title,
        answer,
        source: item.source,
        url: item.link,
        imageUrl: item.imageUrl,
      }
    })
    .filter(item => isCompactAnswer(item.answer))
    .slice(0, 6)
}

export const getClickbaitBusters = unstable_cache(
  buildClickbaitBusters,
  ["clickbait-busters"],
  { revalidate: 60 * 60 * 6 }
)
