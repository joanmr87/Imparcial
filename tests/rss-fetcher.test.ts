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

  it("splits broad world-cup coverage instead of merging it into a fake Scaloni story", () => {
    const clusters = clusterNews([
      {
        source: "Infobae",
        sourceId: "infobae",
        title: "La citación de último momento que realizó Lionel Scaloni para los amistosos de la selección argentina de cara al Mundial 2026",
        description: "Ante la baja de Gonzalo Montiel, el entrenador sumó a Agustín Giay.",
        link: "https://www.infobae.com/deportes/2026/03/24/scaloni-giay/",
        pubDate: "2026-03-24T18:00:00.000Z",
      },
      {
        source: "Clarin",
        sourceId: "clarin",
        title: "Dónde se juega el Repechaje intercontinental para el Mundial 2026 y qué selecciones participan",
        description: "Seis selecciones buscan los últimos dos cupos al Mundial 2026.",
        link: "https://www.clarin.com/deportes/repechaje-mundial-2026.html",
        pubDate: "2026-03-24T18:02:00.000Z",
      },
      {
        source: "La Nacion",
        sourceId: "lanacion",
        title: "Repechajes al Mundial 2026: formatos, días y horarios de todos los partidos",
        description: "Se jugarán los clasificatorios que definirán a los equipos que estarán en la Copa del Mundo.",
        link: "https://www.lanacion.com.ar/deportes/futbol/repechajes-mundial-2026/",
        pubDate: "2026-03-24T18:04:00.000Z",
      },
      {
        source: "Pagina/12",
        sourceId: "pagina12",
        title: "Mundial 2026: denuncian a la FIFA por los altos precios de las entradas",
        description: "La organización de consumidores presentó un reclamo por el valor de los tickets.",
        link: "https://www.pagina12.com.ar/2026/03/24/mundial-2026-entradas/",
        pubDate: "2026-03-24T18:06:00.000Z",
      },
      {
        source: "Ambito",
        sourceId: "ambito",
        title: "De cara al Mundial 2026: la inédita marca que consiguió la Selección Argentina por la cancelación de la Finalissima",
        description: "La Albiceleste sumó otro récord tras la suspensión del cruce con España.",
        link: "https://www.ambito.com/deportes/finalissima-mundial-2026",
        pubDate: "2026-03-24T18:08:00.000Z",
      },
    ])

    expect(
      clusters.some(cluster =>
        cluster.sourcesCount >= 3 &&
        cluster.articles.some(article => article.sourceId === "infobae") &&
        cluster.articles.some(article => article.sourceId === "clarin")
      )
    ).toBe(false)
  })
})
