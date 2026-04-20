import { describe, expect, it } from "vitest"
import { deriveClickbaitFallbackAnswer, extractArticleContextFromHtml } from "../lib/clickbait"
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

  it("does not resolve broad institutional titles with generic answers", () => {
    const item = makeItem({
      title: "Ya es un hecho: el Gobierno confirmó la inscripción gratuita de menores",
      description: "El Gobierno informó que quienes no se inscriban deberán pagar el trámite en el plazo previsto.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBeNull()
  })

  it("rejects retrospective sports hooks that do not hide a useful direct datum", () => {
    const item = makeItem({
      title: "¿Maradona a River? La trama detrás de un pase que pudo cambiar la historia del fútbol argentino",
      description: "La historia se remonta al 24 de abril de 1980, cuando hubo una reunión decisiva entre dirigentes.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBeNull()
  })

  it("rejects lifestyle listicles whose answer only repeats the hook", () => {
    const item = makeItem({
      source: "Clarin",
      sourceId: "clarin",
      title: "Existen 6 tipos de infidelidad: \"Después de terminar mi matrimonio, revelo cuál es la traición más devastadora\"",
      description: "La especialista enumera seis tipos de infidelidad y describe por qué una de ellas duele más.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBeNull()
  })

  it("extracts useful brand lists for resolvable clickbait", () => {
    const item = makeItem({
      source: "iProfesional",
      sourceId: "iprofesional",
      title: "Cuáles son las marcas emblemáticas de leche, queso y yogurt que quebraron o están colapsando",
      description: "Entre los casos aparecen Lácteos Verónica, SanCor, Luz Azul, Sudamericana Lácteos y Saputo.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBe("Lácteos Verónica, SanCor, Luz Azul, Sudamericana Lácteos, Saputo")
  })

  it("extracts the hidden identity when a sports title withholds the player's name", () => {
    const item = makeItem({
      source: "TN",
      sourceId: "tn",
      title: "Preocupación en la Selección: se lesionó un jugador en la práctica y podría perderse el Mundial",
      description: "Durante el entrenamiento, Nicolás González sintió una molestia muscular y quedó en duda para el torneo.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBe("Nicolás González")
  })

  it("rejects abstract answers when the title asks for a place", () => {
    const item = makeItem({
      source: "La Nacion",
      sourceId: "lanacion",
      title: "Dónde queda el Santuario de San Expedito en Buenos Aires para rezar, pedir y agradecer",
      description: "La devoción encuentra sentido en la respuesta ante dificultades y la firmeza en la fe.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBeNull()
  })

  it("rejects numeric inflation answers when the title is asking why", () => {
    const item = makeItem({
      source: "Perfil",
      sourceId: "perfil",
      title: "¿Por qué no baja la inflación en Argentina?",
      description: "La inflación núcleo marcó 2% y el informe describe tensiones en precios regulados y servicios.",
    })

    expect(deriveClickbaitFallbackAnswer(item)).toBeNull()
  })

  it("extracts article context from HTML paragraphs and list items", () => {
    const html = `
      <html>
        <head>
          <meta property="og:description" content="Scaloni analiza una nómina reducida para los amistosos." />
        </head>
        <body>
          <article>
            <p>El técnico citó a Emiliano Martínez, Cristian Romero y Alexis Mac Allister.</p>
            <ul>
              <li>Enzo Fernández</li>
              <li>Julián Álvarez</li>
            </ul>
          </article>
        </body>
      </html>
    `

    expect(extractArticleContextFromHtml(html)).toContain("Emiliano Martínez")
    expect(extractArticleContextFromHtml(html)).toContain("Enzo Fernández")
  })
})
