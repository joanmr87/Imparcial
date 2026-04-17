import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ImpartialArticle } from "../lib/types"

const getDatabaseArticles = vi.fn()
const getDatabaseArticleBySlug = vi.fn()
const getGeneratedEditorialStock = vi.fn()

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
        publishedAt: "2026-04-17T10:00:00.000Z",
        title: "Titulo 1",
        snippet: "Snippet 1",
      },
      {
        id: "s2",
        name: "La Nacion",
        url: "https://example.com/2",
        publishedAt: "2026-04-17T10:10:00.000Z",
        title: "Titulo 2",
        snippet: "Snippet 2",
      },
    ],
    sourceCount: overrides.sourceCount || 2,
    articleCount: overrides.articleCount || 2,
    category: overrides.category || "Politica",
    createdAt: overrides.createdAt || "2026-04-17T10:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-04-17T10:15:00.000Z",
    status: overrides.status || "confirmed",
  }
}

describe("published articles selection", () => {
  beforeEach(() => {
    getDatabaseArticles.mockReset()
    getDatabaseArticleBySlug.mockReset()
    getGeneratedEditorialStock.mockReset()
  })

  it("prioritizes persisted database articles without generating stock on the fly", async () => {
    getDatabaseArticles.mockResolvedValue([
      makeArticle({ id: "db-1", title: "Nota persistida", category: "Economia" }),
    ])

    const { listPublishedArticles } = await import("../lib/articles")
    const result = await listPublishedArticles()

    expect(result.source).toBe("database")
    expect(result.articles.map(article => article.id)).toEqual(["db-1"])
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
})
