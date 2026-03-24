import type { ImpartialArticle, RSSItem } from "./types"

export const HOME_SECTION_ORDER = [
  { slug: "politica", label: "Politica" },
  { slug: "economia", label: "Economia" },
  { slug: "sociedad", label: "Sociedad" },
  { slug: "deportes", label: "Deportes" },
] as const

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some(needle => haystack.includes(needle))
}

export function normalizeSectionSlug(value?: string | null): string | null {
  if (!value) return null

  const normalized = normalizeText(value)
  const match = HOME_SECTION_ORDER.find(section => section.slug === normalized)
  return match?.slug || null
}

export function categoryLabelFromSlug(slug: string): string {
  return HOME_SECTION_ORDER.find(section => section.slug === slug)?.label || "Sociedad"
}

export function inferCategoryFromArticle(article: ImpartialArticle): string {
  const normalized = normalizeText(article.category)

  if (normalized.includes("polit")) return "Politica"
  if (normalized.includes("econ") || normalized.includes("finan") || normalized.includes("nego")) return "Economia"
  if (normalized.includes("deport")) return "Deportes"
  if (normalized.includes("inter")) return "Internacional"
  return "Sociedad"
}

export function inferCategoryFromItem(item: RSSItem): string {
  const text = normalizeText(`${item.link} ${item.title} ${item.description}`)

  if (includesAny(text, [
    "/politica", " politica ", "gobierno", "milei", "presidente", "senado", "diputados", "casa rosada", "ministro", "congreso",
  ])) {
    return "Politica"
  }

  if (includesAny(text, [
    "/economia", "/finanzas", "/negocios", " economia ", "inflacion", "dolar", "mercado", "exportaciones", "acciones", "bonos", "vaca muerta", "petroleo", "banco central",
  ])) {
    return "Economia"
  }

  if (includesAny(text, [
    "/deportes", " seleccion ", "boca", "river", "scaloni", "futbol", "tenis", "basquet", "partido", "liga ",
    "afa", "messi", "mundial", "libertadores", "copa argentina", "marchesin", "montiel", "giay",
    "san lorenzo", "huracan", "racing", "independiente", "cerundolo", "etcheverry", "var",
  ])) {
    return "Deportes"
  }

  if (includesAny(text, [
    "/mundo", "/internacional", "mexico", "brasil", "estados unidos", "eeuu", "europa", "ucrania", "gaza", "texas", "china",
  ])) {
    return "Internacional"
  }

  return "Sociedad"
}
