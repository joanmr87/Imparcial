import { describe, expect, it } from "vitest"
import { inferCategoryFromItem } from "../lib/news-categories"

describe("news categories", () => {
  it("classifies common Argentine sports headlines as Deportes", () => {
    const category = inferCategoryFromItem({
      source: "TN",
      sourceId: "tn",
      title: "Tras la baja de Montiel, Scaloni llamó a Agustín Giay para los amistosos en la Bombonera",
      description: "La AFA confirmó la citación para la Selección argentina.",
      link: "https://tn.com.ar/deportes/futbol/2026/03/24/scaloni-llamo-a-agustin-giay/",
      pubDate: "2026-03-24T20:00:00.000Z",
    })

    expect(category).toBe("Deportes")
  })
})
