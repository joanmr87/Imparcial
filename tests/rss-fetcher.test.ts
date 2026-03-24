import { describe, expect, it } from "vitest"
import { clusterNews } from "../lib/rss-fetcher"

describe("rss clustering", () => {
  it("clusters sports stories with varied headlines when they refer to the same call-up", () => {
    const clusters = clusterNews([
      {
        source: "TN",
        sourceId: "tn",
        title: "Tras la baja de Montiel, Scaloni llamó a Agustín Giay para los amistosos en la Bombonera",
        description: "La Selección argentina sumó al lateral para los amistosos de marzo.",
        link: "https://tn.com.ar/deportes/futbol/giay-scaloni",
        pubDate: "2026-03-24T18:00:00.000Z",
      },
      {
        source: "Clarin",
        sourceId: "clarin",
        title: "Scaloni sumó a un ex San Lorenzo a la Selección por la lesión de Montiel",
        description: "Agustín Giay fue citado para los próximos amistosos rumbo al Mundial 2026.",
        link: "https://www.clarin.com/deportes/scaloni-giay-montiel_0_test.html",
        pubDate: "2026-03-24T18:15:00.000Z",
      },
    ])

    const sportsCluster = clusters.find(cluster => cluster.sourcesCount === 2)

    expect(sportsCluster).toBeDefined()
    expect(sportsCluster?.articles.map(article => article.sourceId).sort()).toEqual(["clarin", "tn"])
  })
})
