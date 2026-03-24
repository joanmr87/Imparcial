import type { RSSItem, Source } from "./types"

type TopicLike = Pick<RSSItem, "title" | "description"> | Pick<Source, "title" | "snippet">

const BASE_STOPWORDS = new Set([
  "a", "al", "ante", "ayer", "bajo", "cara", "como", "con", "contra", "cual", "cuales",
  "cuando", "de", "del", "desde", "donde", "dos", "el", "ella", "ellas", "ellos",
  "en", "entre", "era", "es", "esa", "ese", "eso", "esta", "este", "esto", "fue",
  "fueron", "hay", "hoy", "la", "las", "lo", "los", "mas", "menos", "mi", "mis",
  "mientras", "muy", "no", "o", "para", "pero", "por", "que", "quien",
  "quienes", "se", "segun", "ser", "sin", "sobre", "su", "sus", "tras", "un",
  "una", "uno", "unos", "unas", "ya", "enero", "febrero", "marzo", "abril",
  "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre",
  "diciembre", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado",
  "domingo", "ultimo", "ultima", "ultimos", "ultimas", "momento", "minuto", "vivo",
])

const GENERIC_NEWS_TOKENS = new Set([
  "2025", "2026", "acto", "agenda", "amistoso", "amistosos", "aniversario", "argentina",
  "argentino", "argentinos", "copa", "democracia", "dictadura", "edicion", "estado",
  "fifa", "gobierno", "golpe", "historia", "memoria", "mundial", "oficial", "pais",
  "partido", "partidos", "periodo", "plaza", "presidente", "repechaje", "seleccion",
  "servicio", "tema", "video",
])

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function rawTokens(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !BASE_STOPWORDS.has(token))
}

function significantTokens(text: string): string[] {
  return rawTokens(text).filter(token => !GENERIC_NEWS_TOKENS.has(token))
}

function tokenSet(text: string): Set<string> {
  return new Set(significantTokens(text))
}

function phraseSet(text: string): Set<string> {
  const tokens = significantTokens(text)
  const phrases = new Set<string>()

  for (let index = 0; index < tokens.length - 1; index += 1) {
    phrases.add(`${tokens[index]} ${tokens[index + 1]}`)
  }

  return phrases
}

function overlapScore(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0

  let intersection = 0
  for (const token of left) {
    if (right.has(token)) intersection += 1
  }

  const union = new Set([...left, ...right]).size
  return union === 0 ? 0 : intersection / union
}

function sharedCount(left: Set<string>, right: Set<string>): number {
  let shared = 0
  for (const token of left) {
    if (right.has(token)) shared += 1
  }
  return shared
}

function sourceText(source: TopicLike): string {
  const secondary = "description" in source ? source.description : source.snippet
  return `${source.title} ${secondary || ""}`.trim()
}

export function isStrongTopicMatch(left: TopicLike, right: TopicLike): boolean {
  const leftTitleTokens = tokenSet(left.title)
  const rightTitleTokens = tokenSet(right.title)
  const leftAllTokens = tokenSet(sourceText(left))
  const rightAllTokens = tokenSet(sourceText(right))
  const leftPhrases = phraseSet(left.title)
  const rightPhrases = phraseSet(right.title)

  const sharedTitleTokens = sharedCount(leftTitleTokens, rightTitleTokens)
  const sharedAllTokens = sharedCount(leftAllTokens, rightAllTokens)
  const sharedTitlePhrases = sharedCount(leftPhrases, rightPhrases)
  const titleOverlap = overlapScore(leftTitleTokens, rightTitleTokens)
  const allOverlap = overlapScore(leftAllTokens, rightAllTokens)

  if (sharedTitlePhrases >= 1) return true
  if (sharedTitleTokens >= 2) return true
  if (sharedAllTokens >= 3 && allOverlap >= 0.2) return true
  if (sharedTitleTokens >= 1 && sharedAllTokens >= 2 && titleOverlap >= 0.18) return true

  return false
}

function buildAdjacency<T extends TopicLike>(items: T[]): number[][] {
  const adjacency = items.map(() => [] as number[])

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      if (!isStrongTopicMatch(items[leftIndex], items[rightIndex])) continue
      adjacency[leftIndex].push(rightIndex)
      adjacency[rightIndex].push(leftIndex)
    }
  }

  return adjacency
}

export function coherentTopicGroups<T extends TopicLike>(items: T[]): T[][] {
  if (items.length <= 1) return items.map(item => [item])

  const adjacency = buildAdjacency(items)
  const visited = new Set<number>()
  const groups: T[][] = []

  for (let index = 0; index < items.length; index += 1) {
    if (visited.has(index)) continue

    const queue = [index]
    const component: T[] = []
    visited.add(index)

    while (queue.length > 0) {
      const current = queue.shift()
      if (current === undefined) break
      component.push(items[current])

      for (const neighbor of adjacency[current]) {
        if (visited.has(neighbor)) continue
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }

    groups.push(component)
  }

  return groups.sort((left, right) => right.length - left.length)
}

export function coherentCoverageRatio(items: TopicLike[]): number {
  if (items.length === 0) return 0
  const [largestGroup] = coherentTopicGroups(items)
  return (largestGroup?.length || 0) / items.length
}
