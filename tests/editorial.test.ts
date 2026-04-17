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
    expect(result.article.content).toContain("Claves del hecho")
  })
})
