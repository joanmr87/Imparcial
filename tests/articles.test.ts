import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ImpartialArticle } from "../lib/types"

const getDatabaseArticles = vi.fn()
const getDatabaseArticleBySlug = vi.fn()
const getGeneratedEditorialStock = vi.fn()

vi.mock("../lib/article-dedup", () => ({
  isArticleCoherent: () => true,
}))

vi.mock("../lib/supabase-admin", () => ({
  getDatabaseArticles,
  getDatabaseArticleBySlug,
  isTableMissingError: () => false,
}))

vi.mock("../lib/editorial-stock", () => ({
  getGeneratedEditorialStock,
}))

function makeArticle(overrides: Partial<ImpartialArticle>): ImpartialArticle {
  return {
    id: overrides.id || crypto.randomUUID(),
    slug: overrides.slug || crypto.randomUUID(),
    title: overrides.title || "Titulo",
    summary: overrides.summary || "Resumen corto",
    content: overrides.content || "Parrafo uno.\n\n**Claves del hecho**\n\n- Hecho",
    heroImageUrl: overrides.heroImageUrl,
    facts: overrides.facts || [
      { text: "Hecho confirmado", confirmedBy: ["Clarin"], status: "confirmed" },
      { text: "Hecho reportado", confirmedBy: ["La Nacion"], status: "reported" },
    ],
    discrepancies: overrides.discrepancies || [],
    sources: overrides.sources || [
      {
        id: "s1",
        name: "Clarin",
        url: "https://example.com/1",
        publishedAt: "2026-04-19T10:00:00.000Z",
        title: "El Gobierno anunció una medida económica para esta semana",
        snippet: "La medida económica impacta en precios y actividad.",
      },
      {
        id: "s2",
        name: "La Nacion",
        url: "https://example.com/2",
        publishedAt: "2026-04-19T10:10:00.000Z",
        title: "Nueva medida económica del Gobierno para esta semana",
        snippet: "El anuncio oficial repercute en precios y actividad.",
      },
    ],
    sourceCount: overrides.sourceCount || 2,
    articleCount: overrides.articleCount || 2,
    category: overrides.category || "Politica",
    createdAt: overrides.createdAt || "2026-04-19T10:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-04-19T10:15:00.000Z",
    status: overrides.status || "confirmed",
  }
}

describe("published articles selection", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-19T22:30:00.000Z"))
    getDatabaseArticles.mockReset()
    getDatabaseArticleBySlug.mockReset()
    getGeneratedEditorialStock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("prioritizes persisted database articles without generating stock on the fly", async () => {
    getDatabaseArticles.mockResolvedValue([
      makeArticle({ id: "db-1", title: "Nota persistida 1", category: "Economia" }),
      makeArticle({ id: "db-2", title: "Nota persistida 2", category: "Politica" }),
      makeArticle({ id: "db-3", title: "Nota persistida 3", category: "Sociedad" }),
      makeArticle({ id: "db-4", title: "Nota persistida 4", category: "Deportes" }),
      makeArticle({ id: "db-5", title: "Nota persistida 5", category: "Economia" }),
      makeArticle({ id: "db-6", title: "Nota persistida 6", category: "Politica" }),
      makeArticle({ id: "db-7", title: "Nota persistida 7", category: "Sociedad" }),
      makeArticle({ id: "db-8", title: "Nota persistida 8", category: "Deportes" }),
      makeArticle({ id: "db-9", title: "Nota persistida 9", category: "Economia" }),
      makeArticle({ id: "db-10", title: "Nota persistida 10", category: "Politica" }),
      makeArticle({ id: "db-11", title: "Nota persistida 11", category: "Sociedad" }),
      makeArticle({ id: "db-12", title: "Nota persistida 12", category: "Deportes" }),
    ])

    const { listPublishedArticles } = await import("../lib/articles")
    const result = await listPublishedArticles()

    expect(result.source).toBe("database")
    expect(result.articles).toHaveLength(12)
    expect(getGeneratedEditorialStock).not.toHaveBeenCalled()
  })

  it("falls back to generated stock only when there is no persisted edition available", async () => {
    getDatabaseArticles.mockResolvedValue([])
    getGeneratedEditorialStock.mockResolvedValue([
      makeArticle({ id: "gen-1", title: "Nota de respaldo", category: "Sociedad" }),
    ])

    const { listPublishedArticles } = await import("../lib/articles")
    const result = await listPublishedArticles()

    expect(result.source).toBe("generated")
    expect(result.articles.map(article => article.id)).toEqual(["gen-1"])
    expect(getGeneratedEditorialStock).toHaveBeenCalledOnce()
  })

  it("supplements a sparse or stale persisted edition with fresher generated coverage", async () => {
    getDatabaseArticles.mockResolvedValue([
      makeArticle({
        id: "db-old-1",
        title: "Marcha por el 24 de marzo",
        category: "Politica",
        createdAt: "2026-04-19T10:00:00.000Z",
        updatedAt: "2026-04-19T10:00:00.000Z",
        sources: [
          {
            id: "s1",
            name: "TN",
            url: "https://example.com/old-1",
            publishedAt: "2026-03-24T10:00:00.000Z",
            title: "Marcha y acto por el 24 de marzo en Plaza de Mayo",
            snippet: "Organizaciones de derechos humanos convocaron a la marcha del 24 de marzo en Plaza de Mayo.",
          },
          {
            id: "s2",
            name: "Perfil",
            url: "https://example.com/old-2",
            publishedAt: "2026-03-24T10:10:00.000Z",
            title: "Movilización por el 24 de marzo con acto en Plaza de Mayo",
            snippet: "La movilización del 24 de marzo en Plaza de Mayo reunió organizaciones por memoria y justicia.",
          },
        ],
      }),
    ])
    getGeneratedEditorialStock.mockResolvedValue([
      makeArticle({
        id: "gen-fresh-1",
        title: "El Gobierno anuncia una medida de hoy",
        category: "Politica",
        createdAt: "2026-04-19T22:00:00.000Z",
        updatedAt: "2026-04-19T22:00:00.000Z",
        sources: [
          {
            id: "g1",
            name: "Clarin",
            url: "https://example.com/fresh-1",
            publishedAt: "2026-04-19T21:00:00.000Z",
            title: "Medida de hoy",
            snippet: "Snippet 1",
          },
          {
            id: "g2",
            name: "La Nacion",
            url: "https://example.com/fresh-2",
            publishedAt: "2026-04-19T21:05:00.000Z",
            title: "Medida de hoy",
            snippet: "Snippet 2",
          },
        ],
      }),
    ])

    const { listPublishedArticles } = await import("../lib/articles")
    const result = await listPublishedArticles()

    expect(result.articles[0]?.id).toBe("gen-fresh-1")
    expect(result.articles.some(article => article.id === "db-old-1")).toBe(true)
    expect(getGeneratedEditorialStock).toHaveBeenCalledOnce()
  })
})
