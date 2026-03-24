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

  it("does not cluster a lottery result with an unrelated cultural interview", () => {
    const clusters = clusterNews([
      {
        source: "Infobae",
        sourceId: "infobae",
        title: "Resultado Sinuano Día hoy 24 de marzo",
        description: "Como todos los días, la tradicional lotería colombiana difundió la combinación ganadora del primer sorteo del día.",
        link: "https://www.infobae.com/colombia/2026/03/24/resultado-sinuano-dia-hoy-24-de-marzo/",
        pubDate: "2026-03-24T17:00:00.000Z",
      },
      {
        source: "Pagina/12",
        sourceId: "pagina12",
        title: "Daniel “Pipi” Piazzolla: La oscuridad y el coraje",
        description: "La del 24 de marzo es una conmemoración que debe servirnos para fortalecer la democracia.",
        link: "https://www.pagina12.com.ar/2026/03/23/daniel-pipi-piazzolla-la-oscuridad-y-el-coraje/",
        pubDate: "2026-03-24T17:05:00.000Z",
      },
    ])

    expect(clusters.some(cluster => cluster.sourcesCount >= 2)).toBe(false)
  })
})
