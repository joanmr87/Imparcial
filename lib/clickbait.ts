import { unstable_cache } from "next/cache"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { load } from "cheerio"
import { z } from "zod"
import { getLatestFeedSnapshot } from "./feed-store"
import { inferCategoryFromItem } from "./news-categories"
import { getArgentinaDateKey, safeGetLatestSiteSnapshot, safeGetSiteSnapshot, safeUpsertSiteSnapshot } from "./site-snapshots"
import type { RSSItem } from "./types"

export interface ClickbaitBusterItem {
  id: string
  title: string
  answer: string
  source: string
  url: string
  imageUrl?: string
  rankingScore?: number
}

export interface ClickbaitSnapshotPayload {
  generatedAt: string
  snapshotDate: string
  freshCount: number
  reusedCount: number
  items: ClickbaitBusterItem[]
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

const CLICKBAIT_SNAPSHOT_TYPE = "clickbait"
const CLICKBAIT_SNAPSHOT_SLOT = "daily"
const CLICKBAIT_TARGET_ITEMS = 6

function isMissingIncrementalCacheError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("incrementalCache missing")
}

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

const DIRECT_VALUE_PATTERNS = [
  /^\s*qu[eé]n\b/i,
  /^\s*qu[eé]\b/i,
  /^\s*cu[aá]l\b/i,
  /^\s*cu[aá]les\b/i,
  /^\s*d[oó]nde\b/i,
  /^\s*cu[aá]ndo\b/i,
  /^\s*cu[aá]nto\b/i,
  /^\s*a cu[aá]nto\b/i,
  /^\s*a qu[eé]\s+edad\b/i,
  /^\s*hasta cu[aá]ndo\b/i,
  /^\s*hasta qu[eé]\s+punto\b/i,
  /\ba cu[aá]nto asciende\b/i,
  /\bcitaci[oó]n\b/i,
  /\bconvocad[oa]s?\b/i,
  /\blista\b/i,
  /\bmarcas?\b/i,
  /\bse lesion[oó]\s+(un|una)\b/i,
  /\bpodr[ií]a perderse\b/i,
  /\bse ir[aá]\s+del pa[ií]s\b/i,
]

const LOW_VALUE_PATTERNS = [
  /\bla trama detr[aá]s\b/i,
  /\bque pudo cambiar la historia\b/i,
  /\bhistoria del f[uú]tbol\b/i,
  /\btipos de infidelidad\b/i,
  /\bdespu[eé]s de terminar mi matrimonio\b/i,
  /\btraici[oó]n m[aá]s devastadora\b/i,
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
  /\bpol[eé]mic(?:a|as|o|os)\b/i,
  /\b(var|offside|orsai|expulsi[oó]n)\b/i,
  /\b(?:era|es|fue)\s+penal\b/i,
  /\by por qu[eé]\b/i,
]

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function looksLikePotentialClickbait(item: RSSItem): boolean {
  if (!item.description.trim()) return false
  if (REJECT_PATTERNS.some(pattern => pattern.test(item.title))) return false
  if (LOW_VALUE_PATTERNS.some(pattern => pattern.test(item.title))) return false

  const normalizedTitle = normalizeText(`${item.title} ${item.description} ${item.link}`)
  if (/\b(mexico|usa|estados unidos|\/mexico\/|\/usa\/)\b/.test(normalizedTitle) && !/\bargentina\b/.test(normalizedTitle)) {
    return false
  }

  const hasDirectValuePattern = DIRECT_VALUE_PATTERNS.some(pattern => pattern.test(item.title))
  const hasHintPattern = HINT_PATTERNS.some(pattern => pattern.test(item.title))

  if (!hasDirectValuePattern && !hasHintPattern) return false

  return normalizedTitle.length >= 18
}

function scorePotentialClickbait(item: RSSItem): number {
  let score = 0

  if (DIRECT_VALUE_PATTERNS.some(pattern => pattern.test(item.title))) score += 6
  if (HINT_PATTERNS.some(pattern => pattern.test(item.title))) score += 5
  if (/\bsecret[oa]s?\b/i.test(item.title)) score += 2
  if (/\bque\b/i.test(item.title)) score += 1
  if (/\bcual\b/i.test(item.title)) score += 1
  if (/\bquien\b/i.test(item.title)) score += 1
  if (/\bdonde\b/i.test(item.title)) score += 1
  if (/\bcuanto\b/i.test(item.title)) score += 1
  if (LOW_VALUE_PATTERNS.some(pattern => pattern.test(item.title))) score -= 8

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

function tokenizeLoose(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function hasPluralPriceCue(title: string): boolean {
  return /\bcuanto cuesta\b/.test(title) && /\b(los|las|unos|unas|colegios|autos|departamentos|celulares)\b/.test(title)
}

function addsNewInformation(title: string, answer: string): boolean {
  const titleTokens = new Set(tokenizeLoose(title))
  const answerTokens = tokenizeLoose(answer)
  const meaningfulTokens = answerTokens.filter(token => token.length > 2)
  if (meaningfulTokens.length === 0) return false

  return meaningfulTokens.some(token => !titleTokens.has(token))
}

function looksLikeDateAnswer(answer: string): boolean {
  const normalizedAnswer = normalizeText(answer)
  return /\b\d{1,2}\s+de\s+[a-z]+\s+de\s+\d{4}\b/.test(normalizedAnswer)
    || /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(normalizedAnswer)
    || /\b(hoy|manana|pasado manana)\b/.test(normalizedAnswer)
    || /\b\d{1,2}:\d{2}\b/.test(normalizedAnswer)
}

function looksLikeLocationAnswer(answer: string): boolean {
  const normalizedAnswer = normalizeText(answer)
  const hasLocationPrefix = /^(en|a|al|del?)\s+/.test(normalizedAnswer)
  const hasPlaceCue =
    /\b(santuario|iglesia|parroquia|capilla|catedral|basilica|plaza|estadio|cancha|barrio|avenida|calle|ciudad|provincia|terminal|bombonera|monumental|casa rosada|congreso|obelisco|microcentro)\b/.test(normalizedAnswer)
    || /\ben\s+[A-ZÁÉÍÓÚÑ]/.test(answer)
  const hasAbstractCue = /\b(respuesta|dificultad|firmeza|fe|sentido|forma|manera|motivo|razon|esperanza)\b/.test(normalizedAnswer)

  return hasLocationPrefix && hasPlaceCue && !hasAbstractCue
}

function looksLikeAmountAnswer(answer: string): boolean {
  const normalizedAnswer = normalizeText(answer)
  return /^\$/.test(answer.trim())
    || /\b\d+(?:[.,]\d+)?\s?%/.test(normalizedAnswer)
    || /\b\d+(?:[.,]\d+)?\b/.test(normalizedAnswer)
}

function looksLikePureAmountList(answer: string): boolean {
  const parts = answer
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.length < 2) return false

  return parts.every(part => /^AR?\$?\s?[\d\.\,]+(?:\s*(mil|millones?))?$/i.test(part))
}

function looksLikeIdentityAnswer(answer: string): boolean {
  return /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2}\b/.test(answer.trim())
}

function looksLikeCausalAnswer(answer: string): boolean {
  const normalizedAnswer = normalizeText(answer)
  if (normalizedAnswer.length > 90) return false

  return /^(porque|por\s+(la|el|los|las|un|una)|debido a|ya que|ante\s+|tras\s+)/.test(normalizedAnswer)
}

function expectsNamedListAnswer(title: string): boolean {
  return /\b(cuales|cu[aá]les)\b/.test(title)
    && /\b(declaraciones juradas|documentos|requisitos|papeles|formularios|medios|pasos|claves|nombres|convocados|marcas|autos)\b/.test(title)
}

function isBinaryControversyTitle(title: string): boolean {
  return /\b(var|offside|orsai|expulsi[oó]n|penal)\b/.test(title)
    || /\b(?:era|es|fue)\b/.test(title)
    || /\bultima jugada\b/.test(title)
    || /\bla falta\b/.test(title)
}

function answerMatchesTitleNeed(title: string, answer: string): boolean {
  const normalizedTitle = normalizeText(title)
  const normalizedAnswer = normalizeText(answer)
  const looksLikeDate = looksLikeDateAnswer(answer)
  const looksLikePlace = looksLikeLocationAnswer(answer)
  const looksLikePercent = /\b\d{1,2}(?:[.,]\d+)?\s?%/.test(normalizedAnswer)
  const looksLikeTemperature = /\b(hasta\s+)?\d{2}\s?°/.test(normalizedAnswer)
  const looksLikeList = normalizedAnswer.includes(",")

  if (/^[^a-z0-9]*por que\b/.test(normalizedTitle)) {
    return looksLikeCausalAnswer(answer) && addsNewInformation(title, answer)
  }

  if (isBinaryControversyTitle(normalizedTitle)) {
    return false
  }

  if (/\bdonde\b/.test(normalizedTitle)) {
    return looksLikePlace
  }

  if (/\b(cuando|fecha|que dia|hasta cuando)\b/.test(normalizedTitle)) {
    return looksLikeDate
  }

  if (/^\s*quien\b|^\s*quienes\b|\breemplazante\b|\bse lesiono\b|\bpodria perderse\b|\bse ira del pais\b/.test(normalizedTitle)) {
    return looksLikeIdentityAnswer(answer)
  }

  if (/\ba cuanto\b|\bcuanto cuesta\b|\ba cuanto asciende\b/.test(normalizedTitle)) {
    return looksLikeAmountAnswer(answer) && addsNewInformation(title, answer)
  }

  if (expectsNamedListAnswer(normalizedTitle) && looksLikePureAmountList(answer)) {
    return false
  }

  if (/\b\d+\s+(hipermercados|supermercados|tipos|autos|marcas)\b/.test(normalizedAnswer) && !addsNewInformation(title, answer)) {
    return false
  }

  if (looksLikeDate && !/\b(cuando|fecha|que dia|hasta cuando)\b/.test(normalizedTitle)) return false

  if (looksLikePlace && !/\bdonde\b/.test(normalizedTitle)) return false

  if (looksLikePercent && !/\b(pobreza|inflacion|desempleo|a cuanto asciende|hasta que punto)\b/.test(normalizedTitle)) {
    return false
  }

  if (looksLikeTemperature && !/\b(calor|temperatura|clima|meteorologic|ola de calor)\b/.test(normalizedTitle)) {
    return false
  }

  if (looksLikeList && !/\b(cuales|marcas|autos|convocad|citacion|lista)\b/.test(normalizedTitle)) return false

  if (!addsNewInformation(title, answer) && !looksLikePercent && !looksLikeTemperature) return false

  return true
}

function isValidClickbaitAnswer(answer: string, title?: string): boolean {
  const clean = answer.trim()
  if (clean.length < 3) return false
  if (clean.length > 120) return false
  if (/^\$\s?\d{1,2}$/.test(clean)) return false
  if (/^(no se sabe|sin datos|en vivo)$/i.test(clean)) return false
  if (/^(el gobierno|en estados unidos|en mexico|en uruguay)$/i.test(clean)) return false
  if (looksLikePureAmountList(clean) && (!title || !/\b(a cuanto|multa|montos?|valores?)\b/i.test(title))) return false
  if (title && !answerMatchesTitleNeed(title, clean)) return false
  return true
}

function normalizeResolvedAnswer(answer: string | null, title?: string): string | null {
  if (!answer) return null
  return isValidClickbaitAnswer(answer, title) ? answer : null
}

function extractCapitalizedName(description: string): string | null {
  const match = description.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\b/)
  return match ? match[1] : null
}

function extractLikelyPersonName(text: string): string | null {
  const matches = text.match(/\b([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){1,2})\b/g)
  if (!matches) return null

  const candidates = matches.filter(name => !/^(Seleccion Argentina|Mundial 2026|Fecha FIFA|Buenos Aires)$/i.test(name))
  return candidates[0] || null
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
  const matches = text.match(/\b[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,2}\b/g)
  if (!matches) return null

  const names = [...new Set(matches)]
    .filter(name => !/^(Entre|Desde|Hasta|Luego|Mientras)$/i.test(name))
    .filter(name => name.split(" ").every(part => part.length > 2))
    .slice(0, maxItems)

  return names.length >= 2 ? names.join(", ") : null
}

function deriveClickbaitFallbackAnswerFromContext(item: RSSItem, extraContext: string): string | null {
  const title = normalizeText(item.title)
  const context = `${item.description.trim()} ${extraContext.trim()}`.trim()
  if (!context) return null

  if (/^[^a-z0-9]*por que\b/.test(title)) {
    return null
  }

  if (isBinaryControversyTitle(title)) {
    return null
  }

  if (/\ba cuanto\b|\bcuanto cuesta\b/.test(title)) {
    if (hasPluralPriceCue(title)) return null
    const amountMatch = context.match(/\$\s?\d(?:[\d\.\,\s]*\d)?(?:\s*(mil|millones?))?/i)
    return normalizeResolvedAnswer(amountMatch ? amountMatch[0] : null, item.title)
  }

  if (/\binflacion\b/.test(title)) {
    const percentMatch = context.match(/\b\d{1,2}(?:[.,]\d)?\s?%/i)
    return normalizeResolvedAnswer(percentMatch ? `aprox. ${percentMatch[0].replace(/\s+/g, "")}` : null, item.title)
  }

  if (/\ba que edad\b/.test(title)) {
    const ageMatch = context.match(/\b\d{1,2}\s+años\b/i)
    return normalizeResolvedAnswer(ageMatch ? ageMatch[0] : null, item.title)
  }

  if (/\bdonde\b/.test(title)) {
    const placeMatch = context.match(/\ben\s+(la|el|los|las)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]{3,50}/)
    return normalizeResolvedAnswer(placeMatch ? cleanShortAnswer(placeMatch[0]) : null, item.title)
  }

  if (/\bcalor\b|\btemperatura\b|\bmeteorologic/.test(title)) {
    const tempMatches = [...context.matchAll(/\b(\d{2})\s?°/g)].map(match => Number(match[1]))
    if (tempMatches.length > 0) {
      return normalizeResolvedAnswer(`hasta ${Math.max(...tempMatches)}°`, item.title)
    }
  }

  if (/\bcitacion\b|\bconvocad\b|\blista\b/.test(title)) {
    return normalizeResolvedAnswer(extractNameList(context, 6), item.title)
  }

  if (/\bse lesiono\b|\bpodria perderse\b|\bse ira del pais\b/.test(title)) {
    return normalizeResolvedAnswer(extractLikelyPersonName(context) || extractCapitalizedName(context), item.title)
  }

  if (/^\s*quien\b|^\s*quienes\b|\breemplazante\b/.test(title)) {
    const directCandidate = context.match(/\b(?:a|como)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\b/)
    if (directCandidate) return normalizeResolvedAnswer(directCandidate[1], item.title)
    return normalizeResolvedAnswer(extractCapitalizedName(context), item.title)
  }

  if (/\brevelo\b|\bconfirmo\b|\banuncio\b/.test(title)) {
    return normalizeResolvedAnswer(extractCapitalizedName(context), item.title)
  }

  if (/\bcuales son\b/.test(title)) {
    const extractedNames = extractNameList(context, 6)
    if (extractedNames) return normalizeResolvedAnswer(extractedNames, item.title)

    const countMatch = item.title.match(/\b(\d+)\b/)
    return normalizeResolvedAnswer(countMatch ? `${countMatch[1]} opciones` : null, item.title)
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

export async function buildFreshClickbaitBusters(): Promise<ClickbaitBusterItem[]> {
  const { items } = await getLatestFeedSnapshot()
  const candidatePool = dedupeCandidates(
    items
      .filter(looksLikePotentialClickbait)
      .sort((left, right) => {
        const scoreDifference = scorePotentialClickbait(right) - scorePotentialClickbait(left)
        if (scoreDifference !== 0) return scoreDifference
        return new Date(right.pubDate).getTime() - new Date(left.pubDate).getTime()
      })
      .slice(0, 80)
  )

  if (candidatePool.length === 0) return []

  const enrichedCandidates = await Promise.all(
    candidatePool.slice(0, 24).map(item => fetchArticleContext(item))
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
          "Tambien exclui explicadores mezclados que requieren mas de una respuesta, por ejemplo 'cuales son X y por que pasa Y', porque no entran bien en una card.",
          "Exclui controversias de arbitraje, VAR, faltas, polemicas o preguntas de opinion tipo 'era penal' o 'fue correcto', porque no esconden un dato concreto sino una discusion.",
          "Si la respuesta es una lista, devolvela como lista compacta separada por comas.",
          "Si es un pronostico, devolvelo tipo 'hasta 39°' o 'llueve el jueves'.",
          "Si es una cifra estimada, devolvela tipo 'aprox. 4%'.",
          "Si es una convocatoria o citacion, devolve solo los nombres.",
          "Si el titular oculta una identidad sin preguntar de forma directa, por ejemplo 'se lesionó un jugador' o 'una cantante se irá del país', devolvé el nombre propio.",
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
        if (!answer || !isValidClickbaitAnswer(answer, enrichedCandidates[Number(item.id.split(":")[1])]?.title)) continue

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
        .slice(0, CLICKBAIT_TARGET_ITEMS)
        .map(({ totalScore, ...item }) => ({ ...item, rankingScore: totalScore }))

      if (rankedByAi.length >= CLICKBAIT_TARGET_ITEMS) return rankedByAi

      if (rankedByAi.length > 0) {
        const fallbackItems = buildFallbackItems(enrichedCandidates)
        const merged: ClickbaitBusterItem[] = [...rankedByAi]

        for (const fallbackItem of fallbackItems) {
          if (merged.some(item => item.id === fallbackItem.id)) continue
          merged.push(fallbackItem)
          if (merged.length >= CLICKBAIT_TARGET_ITEMS) break
        }

        if (merged.length > 0) return merged.slice(0, CLICKBAIT_TARGET_ITEMS)
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
        rankingScore: heuristicScore,
        heuristicScore,
      }
    })
    .filter((item): item is ClickbaitBusterItem & { heuristicScore: number } => item !== null)
    .sort((left, right) => right.heuristicScore - left.heuristicScore)
    .slice(0, CLICKBAIT_TARGET_ITEMS)
    .map(({ heuristicScore: _heuristicScore, ...item }) => item)

  return fallbackItems
}

function clickbaitRankingScore(item: ClickbaitBusterItem): number {
  return item.rankingScore || 0
}

function dedupeClickbaitItems(items: ClickbaitBusterItem[]): ClickbaitBusterItem[] {
  const merged = new Map<string, ClickbaitBusterItem>()

  for (const item of items) {
    const existing = merged.get(item.id)
    if (!existing || clickbaitRankingScore(item) > clickbaitRankingScore(existing)) {
      merged.set(item.id, item)
    }
  }

  return [...merged.values()]
}

function mergeClickbaitItems(
  freshItems: ClickbaitBusterItem[],
  previousItems: ClickbaitBusterItem[],
  limit = CLICKBAIT_TARGET_ITEMS
): ClickbaitBusterItem[] {
  const merged = dedupeClickbaitItems([...freshItems, ...previousItems])
    .sort((left, right) => clickbaitRankingScore(right) - clickbaitRankingScore(left))
    .slice(0, limit)

  return merged
}

const getEmergencyClickbaitBusters = unstable_cache(
  buildFreshClickbaitBusters,
  ["clickbait-busters-emergency-v1"],
  { revalidate: 60 * 60 * 12 }
)

export async function refreshDailyClickbaitEdition(options: {
  force?: boolean
  snapshotDate?: string
} = {}): Promise<ClickbaitSnapshotPayload> {
  const snapshotDate = options.snapshotDate || getArgentinaDateKey()

  if (!options.force) {
    const existingSnapshot = await safeGetSiteSnapshot<ClickbaitSnapshotPayload>(
      CLICKBAIT_SNAPSHOT_TYPE,
      snapshotDate,
      CLICKBAIT_SNAPSHOT_SLOT
    )
    if (existingSnapshot) {
      return existingSnapshot.payload
    }
  }

  const latestSnapshot = await safeGetLatestSiteSnapshot<ClickbaitSnapshotPayload>(
    CLICKBAIT_SNAPSHOT_TYPE,
    CLICKBAIT_SNAPSHOT_SLOT
  )
  const previousItems = latestSnapshot?.snapshotDate === snapshotDate
    ? []
    : (latestSnapshot?.payload.items || [])
  const freshItems = await buildFreshClickbaitBusters()
  const items = mergeClickbaitItems(freshItems, previousItems)
  const payload: ClickbaitSnapshotPayload = {
    generatedAt: new Date().toISOString(),
    snapshotDate,
    freshCount: freshItems.length,
    reusedCount: Math.max(0, items.length - freshItems.length),
    items,
  }

  const storedSnapshot = await safeUpsertSiteSnapshot({
    snapshotType: CLICKBAIT_SNAPSHOT_TYPE,
    snapshotDate,
    snapshotSlot: CLICKBAIT_SNAPSHOT_SLOT,
    payload,
  })

  return storedSnapshot?.payload || payload
}

async function readPublishedClickbaitEdition(): Promise<ClickbaitSnapshotPayload> {
  const snapshotDate = getArgentinaDateKey()
  const todaySnapshot = await safeGetSiteSnapshot<ClickbaitSnapshotPayload>(
    CLICKBAIT_SNAPSHOT_TYPE,
    snapshotDate,
    CLICKBAIT_SNAPSHOT_SLOT
  )
  const todayItems = todaySnapshot?.payload.items || []

  if (todayItems.length >= CLICKBAIT_TARGET_ITEMS && todaySnapshot) {
    return todaySnapshot.payload
  }

  const latestSnapshot = await safeGetLatestSiteSnapshot<ClickbaitSnapshotPayload>(
    CLICKBAIT_SNAPSHOT_TYPE,
    CLICKBAIT_SNAPSHOT_SLOT
  )
  const previousItems = latestSnapshot?.snapshotDate === snapshotDate
    ? []
    : (latestSnapshot?.payload.items || [])

  if (todaySnapshot) {
    const emergencyItems = await getEmergencyClickbaitBusters()
    const repairedItems = mergeClickbaitItems(
      [...todayItems, ...emergencyItems],
      previousItems
    )
    const repairedPayload: ClickbaitSnapshotPayload = {
      ...todaySnapshot.payload,
      freshCount: Math.max(todaySnapshot.payload.freshCount, emergencyItems.length),
      reusedCount: Math.max(0, repairedItems.length - emergencyItems.length),
      items: repairedItems,
    }

    const storedSnapshot = await safeUpsertSiteSnapshot({
      snapshotType: CLICKBAIT_SNAPSHOT_TYPE,
      snapshotDate,
      snapshotSlot: CLICKBAIT_SNAPSHOT_SLOT,
      payload: repairedPayload,
    })

    return storedSnapshot?.payload || repairedPayload
  }

  if (latestSnapshot?.payload.items.length) {
    return latestSnapshot.payload
  }

  const emergencyItems = await getEmergencyClickbaitBusters()
  return {
    generatedAt: new Date().toISOString(),
    snapshotDate,
    freshCount: emergencyItems.length,
    reusedCount: 0,
    items: emergencyItems.slice(0, CLICKBAIT_TARGET_ITEMS),
  }
}

const getCachedPublishedClickbaitEdition = unstable_cache(
  readPublishedClickbaitEdition,
  ["published-clickbait-edition-v1"],
  { revalidate: 900 }
)

export async function getPublishedClickbaitEdition(): Promise<ClickbaitSnapshotPayload> {
  try {
    return await getCachedPublishedClickbaitEdition()
  } catch (error) {
    if (isMissingIncrementalCacheError(error)) {
      return readPublishedClickbaitEdition()
    }

    throw error
  }
}

export async function getClickbaitBusters(): Promise<ClickbaitBusterItem[]> {
  const edition = await getPublishedClickbaitEdition()
  return edition.items
}
