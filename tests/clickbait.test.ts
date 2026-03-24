import { describe, expect, it } from "vitest"
import { deriveClickbaitFallbackAnswer } from "../lib/clickbait"
import type { RSSItem } from "../lib/types"

function makeItem(overrides: Partial<RSSItem>): RSSItem {
  return {
    source: overrides.source || "Infobae",
    sourceId: overrides.sourceId || "infobae",
    title: overrides.title || "Titulo",
    description: overrides.description || "",
    link: overrides.link || "https://example.com",
    pubDate: overrides.pubDate || "2026-03-24T10:00:00.000Z",
    imageUrl: overrides.imageUrl,
  }
}

describe("clickbait fallback answers", () => {
  it("extracts money amounts for 'a cuánto' titles", () => {
    const item = makeItem({
      title: "A cuánto cotiza el dólar blue hoy",
      description: "El dólar blue se vende a $1.425 en la city porteña durante la jornada.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBe("$1.425")
  })

  it("rejects plural price list titles that cannot be answered in one datum", () => {
    const item = makeItem({
      title: "Cuánto cuesta estudiar en los colegios argentinos que formaron presidentes",
      description: "Las cuotas arrancan en $ 2.050.000 en algunos casos y varían según la institución.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBeNull()
  })

  it("extracts names for 'quién' titles", () => {
    const item = makeItem({
      title: "Quién será el reemplazante de Marchesín en Boca",
      description: "Fernando Gago analiza a Leandro Brey como principal alternativa para el arco xeneize.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBe("Leandro Brey")
  })

  it("extracts places for 'dónde' titles", () => {
    const item = makeItem({
      title: "Dónde jugará Argentina su próximo partido",
      description: "La selección volvería a presentarse en la Bombonera si se confirma la logística prevista por AFA.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBe("en la Bombonera")
  })

  it("does not guess names when the title is not a direct 'quién' question", () => {
    const item = makeItem({
      title: "Ordenan levantar el secreto fiscal para saber quién pagó los viajes de Adorni",
      description: "La justicia busca determinar si hubo aportes de terceros y analiza documentación vinculada a Uruguay.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBeNull()
  })
})
