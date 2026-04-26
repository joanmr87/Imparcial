import { describe, expect, it } from "vitest"
import { generateImpartialArticle } from "../lib/editorial"

describe("editorial fallback generation", () => {
  it("builds an internal article even without OpenAI configured", async () => {
    const originalKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    const result = await generateImpartialArticle("Aumenta la presión sobre el dólar blue", [
      {
        source: "Infobae",
        sourceId: "infobae",
        title: "A cuánto cotiza el dólar blue hoy",
        description: "El dólar blue se vende a $1.425 en la city porteña y la brecha se mantiene en niveles altos.",
        link: "https://example.com/1",
        pubDate: "2026-03-24T12:00:00.000Z",
      },
      {
        source: "Ámbito",
        sourceId: "ambito",
        title: "El dólar blue volvió a subir este martes",
        description: "El mercado paralelo mostró una nueva suba y el tipo de cambio informal se negoció a $1.425.",
        link: "https://example.com/2",
        pubDate: "2026-03-24T12:05:00.000Z",
      },
    ])

    process.env.OPENAI_API_KEY = originalKey

    expect(result.article.title.length).toBeGreaterThan(20)
    expect(result.article.summary).not.toContain("Diario Imparcial")
    expect(result.article.sources).toHaveLength(2)
    expect(result.article.category).toBe("Economia")
    expect(result.article.content.split("\n\n").length).toBeGreaterThanOrEqual(4)
    expect(result.article.content).not.toContain("Claves del hecho")
    expect(result.article.content).not.toContain("Lo que aportan las coberturas")
  })

  it("keeps a stable slug for the same topic even if source order changes", async () => {
    const originalKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    const sources = [
      {
        source: "Clarin",
        sourceId: "clarin",
        title: "Colapinto habló antes del road show en Buenos Aires",
        description: "El piloto argentino se presentará en una exhibición sobre la avenida Figueroa Alcorta ante miles de fanáticos.",
        link: "https://example.com/clarin-colapinto",
        pubDate: "2026-04-26T11:00:00.000Z",
      },
      {
        source: "Infobae",
        sourceId: "infobae",
        title: "Franco Colapinto saldrá a pista en Palermo con un Fórmula 1",
        description: "La exhibición incluirá actividades para el público y una recorrida por un circuito callejero especialmente montado.",
        link: "https://example.com/infobae-colapinto",
        pubDate: "2026-04-26T11:05:00.000Z",
      },
    ]

    const first = await generateImpartialArticle("Franco Colapinto se prepara para rodar con un Fórmula 1 por las calles de Buenos Aires", sources)
    const second = await generateImpartialArticle(
      "Franco Colapinto se prepara para rodar con un Fórmula 1 por las calles de Buenos Aires",
      [...sources].reverse()
    )

    process.env.OPENAI_API_KEY = originalKey

    expect(first.article.slug).toBe(second.article.slug)
  })
})
