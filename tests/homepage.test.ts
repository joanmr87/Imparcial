import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ImpartialArticle } from "../lib/types"

const listPublishedArticles = vi.fn()

vi.mock("../lib/articles", () => ({
  listPublishedArticles,
}))

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

describe("homepage edition", () => {
  beforeEach(() => {
    listPublishedArticles.mockReset()
  })

  it("does not fall back to unrelated articles when a filtered section is empty", async () => {
    listPublishedArticles.mockResolvedValue({
      articles: [
        makeArticle({ id: "p1", title: "Politica 1", category: "Politica" }),
        makeArticle({ id: "s1", title: "Sociedad 1", category: "Sociedad" }),
      ],
      source: "generated",
      warning: undefined,
    })

    const { getHomepageEdition } = await import("../lib/homepage")
    const edition = await getHomepageEdition("deportes")

    expect(edition.activeSectionLabel).toBe("Deportes")
    expect(edition.articles).toEqual([])
    expect(edition.sections).toEqual([
      {
        slug: "deportes",
        label: "Deportes",
        lead: undefined,
        articles: [],
      },
    ])
  })
})
