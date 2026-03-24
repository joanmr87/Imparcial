import { describe, expect, it } from "vitest"
import { areArticlesNearDuplicate, dedupeSimilarArticles, pickDistinctArticles, prioritizeArticleVariety } from "../lib/article-dedup"
import type { ImpartialArticle } from "../lib/types"

function makeArticle(overrides: Partial<ImpartialArticle>): ImpartialArticle {
  return {
    id: overrides.id || crypto.randomUUID(),
    slug: overrides.slug || crypto.randomUUID(),
    title: overrides.title || "Titulo",
    summary: overrides.summary || "Resumen",
    content: overrides.content || "Contenido",
    facts: overrides.facts || [],
    discrepancies: overrides.discrepancies || [],
    sources: overrides.sources || [],
    sourceCount: overrides.sourceCount || 2,
    articleCount: overrides.articleCount || 2,
    category: overrides.category || "Politica",
    createdAt: overrides.createdAt || "2026-03-24T10:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-03-24T10:00:00.000Z",
    status: overrides.status || "confirmed",
  }
}

describe("article dedup", () => {
  it("detects near-duplicate articles with overlapping titles and shared sources", () => {
    const left = makeArticle({
      title: "A 50 años del golpe militar, manifestantes llenan la Plaza de Mayo",
      sources: [{ id: "1", name: "TN", url: "https://tn.com/a", publishedAt: "", title: "", snippet: "" }],
    })

    const right = makeArticle({
      title: "A 50 años del golpe militar, manifestantes comienzan a llenar la Plaza de Mayo",
      sources: [{ id: "2", name: "TN", url: "https://tn.com/a", publishedAt: "", title: "", snippet: "" }],
    })

    expect(areArticlesNearDuplicate(left, right)).toBe(true)
  })

  it("keeps the strongest version among near-duplicates", () => {
    const weaker = makeArticle({
      id: "a",
      title: "Marchas por los 50 años del golpe",
      sourceCount: 2,
      articleCount: 2,
      updatedAt: "2026-03-24T09:00:00.000Z",
      sources: [{ id: "1", name: "TN", url: "https://tn.com/a", publishedAt: "", title: "", snippet: "" }],
    })

    const stronger = makeArticle({
      id: "b",
      title: "Marchas por los 50 años del golpe de Estado en Argentina",
      sourceCount: 3,
      articleCount: 3,
      updatedAt: "2026-03-24T10:00:00.000Z",
      sources: [{ id: "2", name: "TN", url: "https://tn.com/a", publishedAt: "", title: "", snippet: "" }],
    })

    expect(dedupeSimilarArticles([weaker, stronger])).toEqual([stronger])
  })

  it("detects duplicates even when the source URLs differ but the article body overlaps heavily", () => {
    const left = makeArticle({
      title: "Kicillof encabezó el acto por Memoria en Plaza de Mayo",
      summary: "La movilización reunió a organismos de derechos humanos y referentes políticos.",
      facts: [{ text: "La marcha reunió a organismos de derechos humanos en Plaza de Mayo.", confirmedBy: ["TN"], status: "reported" }],
      sources: [{ id: "1", name: "TN", url: "https://tn.com/a", publishedAt: "", title: "", snippet: "" }],
    })

    const right = makeArticle({
      title: "Acto por la Memoria en Plaza de Mayo con presencia de Kicillof",
      summary: "La movilización reunió a organismos de derechos humanos y referentes políticos en el centro porteño.",
      facts: [{ text: "La marcha reunió a organismos de derechos humanos en Plaza de Mayo.", confirmedBy: ["Perfil"], status: "reported" }],
      sources: [{ id: "2", name: "Perfil", url: "https://perfil.com/b", publishedAt: "", title: "", snippet: "" }],
    })

    expect(areArticlesNearDuplicate(left, right)).toBe(true)
  })

  it("prioritizes category variety for the lead selection", () => {
    const articles = [
      makeArticle({ id: "1", category: "Politica", title: "Politica 1" }),
      makeArticle({ id: "2", category: "Politica", title: "Politica 2" }),
      makeArticle({ id: "3", category: "Economia", title: "Economia 1" }),
      makeArticle({ id: "4", category: "Deportes", title: "Deportes 1" }),
    ]

    const selected = prioritizeArticleVariety(articles, 3)
    expect(selected.map(article => article.category)).toEqual(["Politica", "Economia", "Deportes"])
  })

  it("keeps a more diverse mix inside a crowded section", () => {
    const articles = [
      makeArticle({ id: "1", category: "Politica", title: "Marcha del 24 de marzo en Plaza de Mayo", summary: "Organizaciones marchan en Plaza de Mayo." }),
      makeArticle({ id: "2", category: "Politica", title: "24 de marzo: concentración en Plaza de Mayo", summary: "Organizaciones marchan en Plaza de Mayo con acto previsto." }),
      makeArticle({ id: "3", category: "Politica", title: "Kicillof cuestionó la política económica de la dictadura", summary: "El gobernador habló por el Día de la Memoria." }),
    ]

    const selected = pickDistinctArticles(articles, 2)
    expect(selected.map(article => article.id)).toEqual(["1", "3"])
  })
})
