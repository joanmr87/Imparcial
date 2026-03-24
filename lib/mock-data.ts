import type { ImpartialArticle } from "./types"

// Mock data for MVP demonstration
// In production, this would come from the AI processing pipeline

export const mockArticles: ImpartialArticle[] = [
  {
    id: "1",
    slug: "gobierno-anuncia-nuevas-medidas-economicas",
    title: "El Gobierno anuncio nuevas medidas economicas para contener la inflacion",
    summary: "El Ministerio de Economia presento un paquete de medidas que incluye ajustes en el tipo de cambio y nuevos acuerdos de precios. Las fuentes difieren en el impacto proyectado sobre los salarios.",
    content: `El Ministerio de Economia anuncio hoy un nuevo paquete de medidas economicas orientadas a contener la inflacion. Segun el comunicado oficial, las medidas incluyen:

**Hechos confirmados por multiples fuentes:**

- El tipo de cambio oficial se ajustara en un 2% mensual durante el proximo trimestre.
- Se firmaron acuerdos de precios con 150 empresas del sector alimenticio.
- El Banco Central mantendra la tasa de referencia en el nivel actual.

**Informacion atribuida:**

Segun Infobae, el ministro indico que "estas medidas son transitorias y buscan estabilizar la macroeconomia en el corto plazo".

La Nacion reporta que fuentes del Ministerio anticipan una desaceleracion de la inflacion hacia el segundo semestre.

Clarin destaca que sectores empresariales expresaron "cautela optimista" ante los anuncios.

**Puntos en los que difieren las fuentes:**

Respecto al impacto en salarios, TN indica que habria un ajuste del 5% en el proximo mes, mientras que Infobae menciona que las negociaciones salariales se definiran en paritarias sectoriales sin porcentaje anticipado.`,
    facts: [
      { text: "Ajuste del tipo de cambio del 2% mensual", confirmedBy: ["Infobae", "La Nacion", "Clarin", "TN"], status: "confirmed" },
      { text: "Acuerdos de precios con 150 empresas alimenticias", confirmedBy: ["Infobae", "La Nacion", "Clarin"], status: "confirmed" },
      { text: "Tasa de referencia se mantiene", confirmedBy: ["La Nacion", "Clarin", "TN"], status: "confirmed" },
      { text: "Ajuste salarial del 5%", confirmedBy: ["TN"], status: "reported" },
    ],
    discrepancies: [
      {
        topic: "Impacto en salarios",
        claims: [
          { source: "TN", claim: "Ajuste salarial del 5% el proximo mes" },
          { source: "Infobae", claim: "Se definira en paritarias sectoriales, sin porcentaje anticipado" }
        ]
      }
    ],
    sources: [
      { id: "s1", name: "Infobae", url: "https://infobae.com/economia/...", publishedAt: "2026-03-13T10:30:00Z", title: "El Gobierno lanzo un paquete economico con ajuste cambiario", snippet: "El ministro presento las medidas..." },
      { id: "s2", name: "La Nacion", url: "https://lanacion.com.ar/economia/...", publishedAt: "2026-03-13T10:45:00Z", title: "Nuevas medidas economicas: que incluye el plan oficial", snippet: "El paquete contempla..." },
      { id: "s3", name: "Clarin", url: "https://clarin.com/economia/...", publishedAt: "2026-03-13T11:00:00Z", title: "El plan economico del Gobierno: los puntos clave", snippet: "Las empresas firmaron acuerdos..." },
      { id: "s4", name: "TN", url: "https://tn.com.ar/economia/...", publishedAt: "2026-03-13T11:15:00Z", title: "Anuncian medidas economicas y ajuste salarial", snippet: "Se espera un incremento del 5%..." }
    ],
    sourceCount: 4,
    articleCount: 7,
    category: "Economia",
    createdAt: "2026-03-13T11:30:00Z",
    updatedAt: "2026-03-13T11:30:00Z",
    status: "confirmed"
  },
  {
    id: "2",
    slug: "senado-debate-reforma-judicial",
    title: "El Senado debate la reforma judicial en sesion extraordinaria",
    summary: "La Camara Alta inicio el tratamiento del proyecto de reforma del sistema judicial. Hay diferencias sobre el numero de votos necesarios para su aprobacion.",
    content: `El Senado de la Nacion inicio hoy una sesion extraordinaria para debatir el proyecto de reforma judicial presentado por el oficialismo.

**Hechos confirmados:**

- La sesion comenzo a las 10:00 hs con 68 senadores presentes.
- El proyecto propone la creacion de 5 nuevos juzgados federales.
- El debate se extenderia por al menos dos dias segun fuentes parlamentarias.

**Informacion atribuida:**

Segun Pagina/12, el oficialismo cuenta con los votos necesarios para aprobar el proyecto.

La Nacion reporta que la oposicion presentara un dictamen alternativo.

**Puntos en los que difieren las fuentes:**

Existe discrepancia sobre la cantidad de votos que el oficialismo tiene asegurados.`,
    facts: [
      { text: "Sesion inicio a las 10:00 con 68 senadores", confirmedBy: ["Infobae", "La Nacion", "Clarin"], status: "confirmed" },
      { text: "Proyecto propone 5 nuevos juzgados federales", confirmedBy: ["La Nacion", "Pagina/12", "Clarin"], status: "confirmed" },
      { text: "Debate durara al menos dos dias", confirmedBy: ["Infobae", "TN"], status: "reported" },
    ],
    discrepancies: [
      {
        topic: "Votos del oficialismo",
        claims: [
          { source: "Pagina/12", claim: "Cuenta con 37 votos asegurados" },
          { source: "La Nacion", claim: "Tendria entre 34 y 36 votos" },
          { source: "Clarin", claim: "No alcanzaria los votos necesarios" }
        ]
      }
    ],
    sources: [
      { id: "s5", name: "La Nacion", url: "https://lanacion.com.ar/politica/...", publishedAt: "2026-03-13T09:00:00Z", title: "Arranca el debate por la reforma judicial", snippet: "La oposicion presentaria..." },
      { id: "s6", name: "Pagina/12", url: "https://pagina12.com.ar/politica/...", publishedAt: "2026-03-13T09:30:00Z", title: "Reforma judicial: el oficialismo va por la aprobacion", snippet: "Con 37 votos asegurados..." },
      { id: "s7", name: "Clarin", url: "https://clarin.com/politica/...", publishedAt: "2026-03-13T09:45:00Z", title: "Tension en el Senado por la reforma judicial", snippet: "El numero de votos es incierto..." }
    ],
    sourceCount: 3,
    articleCount: 5,
    category: "Politica",
    createdAt: "2026-03-13T10:00:00Z",
    updatedAt: "2026-03-13T10:00:00Z",
    status: "developing"
  },
  {
    id: "3",
    slug: "temporal-afecta-provincia-buenos-aires",
    title: "Un fuerte temporal afecto a varias localidades del conurbano bonaerense",
    summary: "Lluvias intensas y vientos fuertes causaron anegamientos en al menos 10 partidos. Los reportes varian sobre la cantidad de evacuados.",
    content: `Un fuerte temporal con lluvias intensas afecto durante la madrugada a diversas localidades del conurbano bonaerense.

**Hechos confirmados:**

- Se registraron precipitaciones de mas de 80mm en algunas zonas.
- Defensa Civil de la Provincia confirmo anegamientos en al menos 10 partidos.
- Se interrumpio el servicio del Ferrocarril Roca entre Constitucion y La Plata.

**Informacion atribuida:**

TN reporta que el Municipio de Quilmes declaro la emergencia climatica.

Infobae indica que mas de 200 familias debieron ser asistidas.

**Puntos de discrepancia:**

Las fuentes difieren significativamente en el numero de personas evacuadas.`,
    facts: [
      { text: "Precipitaciones superiores a 80mm", confirmedBy: ["Infobae", "TN", "Clarin"], status: "confirmed" },
      { text: "Anegamientos en al menos 10 partidos", confirmedBy: ["Infobae", "La Nacion", "TN"], status: "confirmed" },
      { text: "Servicio del Roca interrumpido", confirmedBy: ["Clarin", "TN", "La Nacion"], status: "confirmed" },
    ],
    discrepancies: [
      {
        topic: "Cantidad de evacuados",
        claims: [
          { source: "TN", claim: "Mas de 500 evacuados" },
          { source: "Infobae", claim: "Alrededor de 300 evacuados" },
          { source: "Clarin", claim: "Cerca de 400 familias afectadas" }
        ]
      }
    ],
    sources: [
      { id: "s8", name: "TN", url: "https://tn.com.ar/sociedad/...", publishedAt: "2026-03-13T06:00:00Z", title: "Temporal en el conurbano: mas de 500 evacuados", snippet: "Las lluvias no ceden..." },
      { id: "s9", name: "Infobae", url: "https://infobae.com/sociedad/...", publishedAt: "2026-03-13T06:30:00Z", title: "Fuertes lluvias causan estragos en el GBA", snippet: "Unas 300 personas fueron evacuadas..." },
      { id: "s10", name: "Clarin", url: "https://clarin.com/sociedad/...", publishedAt: "2026-03-13T07:00:00Z", title: "Alerta por el temporal: el estado de los accesos", snippet: "Cerca de 400 familias..." },
      { id: "s11", name: "La Nacion", url: "https://lanacion.com.ar/sociedad/...", publishedAt: "2026-03-13T07:15:00Z", title: "Temporal en Buenos Aires: cuales son las zonas mas afectadas", snippet: "Defensa Civil trabaja en el lugar..." }
    ],
    sourceCount: 4,
    articleCount: 8,
    category: "Sociedad",
    createdAt: "2026-03-13T07:30:00Z",
    updatedAt: "2026-03-13T08:00:00Z",
    status: "developing"
  },
  {
    id: "4",
    slug: "dolar-blue-cotizacion-marzo",
    title: "El dolar blue opero estable mientras el oficial se mantuvo sin cambios",
    summary: "El mercado cambiario mostro poca volatilidad tras los anuncios economicos. Analistas coinciden en una tendencia a la estabilidad en el corto plazo.",
    content: `El mercado cambiario argentino opero con relativa calma en la jornada de hoy.

**Hechos confirmados:**

- El dolar blue cerro a $1.180 para la venta, sin variacion respecto al dia anterior.
- El dolar oficial minorista se ubico en $920.
- La brecha cambiaria se mantuvo en torno al 28%.

**Informacion atribuida:**

Segun El Cronista, operadores del mercado anticipan estabilidad hasta fin de mes.

Ambito reporta que la demanda de divisas se redujo un 15% respecto a la semana pasada.`,
    facts: [
      { text: "Dolar blue cerro a $1.180", confirmedBy: ["Infobae", "Clarin", "Ambito", "El Cronista"], status: "confirmed" },
      { text: "Dolar oficial minorista a $920", confirmedBy: ["La Nacion", "Clarin", "Ambito"], status: "confirmed" },
      { text: "Brecha cambiaria del 28%", confirmedBy: ["El Cronista", "Infobae"], status: "confirmed" },
    ],
    discrepancies: [],
    sources: [
      { id: "s12", name: "Ambito", url: "https://ambito.com/finanzas/...", publishedAt: "2026-03-13T17:00:00Z", title: "Dolar hoy: cotizacion del blue y el oficial", snippet: "El blue cerro sin cambios..." },
      { id: "s13", name: "El Cronista", url: "https://cronista.com/finanzas/...", publishedAt: "2026-03-13T17:15:00Z", title: "Mercado cambiario: jornada de calma", snippet: "Operadores ven estabilidad..." },
      { id: "s14", name: "Infobae", url: "https://infobae.com/economia/...", publishedAt: "2026-03-13T17:30:00Z", title: "A cuanto cotiza el dolar blue hoy", snippet: "La divisa paralela..." },
      { id: "s15", name: "La Nacion", url: "https://lanacion.com.ar/economia/...", publishedAt: "2026-03-13T17:45:00Z", title: "Dolar: precio del blue y el oficial", snippet: "El mercado opero con calma..." }
    ],
    sourceCount: 4,
    articleCount: 6,
    category: "Economia",
    createdAt: "2026-03-13T18:00:00Z",
    updatedAt: "2026-03-13T18:00:00Z",
    status: "confirmed"
  },
  {
    id: "5",
    slug: "seleccion-argentina-convocados-eliminatorias",
    title: "La Seleccion Argentina dio a conocer la lista de convocados para las Eliminatorias",
    summary: "El cuerpo tecnico confirmo los 26 jugadores que disputaran los proximos partidos. Destaca el regreso de varios futbolistas tras lesiones.",
    content: `La Seleccion Argentina de futbol publico hoy la nomina de 26 jugadores convocados para los proximos partidos de Eliminatorias Sudamericanas.

**Hechos confirmados:**

- La lista incluye 26 futbolistas.
- Los partidos se jugaran el 20 y 25 de marzo.
- El capitan esta incluido en la convocatoria.

**Informacion atribuida:**

TN reporta que el entrenador destaco "la profundidad del plantel".

Infobae senala el regreso de jugadores que estaban lesionados.`,
    facts: [
      { text: "Lista de 26 convocados confirmada", confirmedBy: ["TN", "Infobae", "Clarin", "La Nacion"], status: "confirmed" },
      { text: "Partidos el 20 y 25 de marzo", confirmedBy: ["TN", "Infobae", "Clarin"], status: "confirmed" },
    ],
    discrepancies: [],
    sources: [
      { id: "s16", name: "TN", url: "https://tn.com.ar/deportes/...", publishedAt: "2026-03-13T12:00:00Z", title: "Seleccion Argentina: los 26 convocados", snippet: "El DT confirmo la lista..." },
      { id: "s17", name: "Infobae", url: "https://infobae.com/deportes/...", publishedAt: "2026-03-13T12:15:00Z", title: "Eliminatorias: la lista de la Seleccion", snippet: "Vuelven los lesionados..." },
      { id: "s18", name: "Clarin", url: "https://clarin.com/deportes/...", publishedAt: "2026-03-13T12:30:00Z", title: "Convocados de Argentina para Eliminatorias", snippet: "Son 26 los elegidos..." }
    ],
    sourceCount: 3,
    articleCount: 4,
    category: "Deportes",
    createdAt: "2026-03-13T13:00:00Z",
    updatedAt: "2026-03-13T13:00:00Z",
    status: "confirmed"
  }
]

export function getArticleBySlug(slug: string): ImpartialArticle | undefined {
  return mockArticles.find(article => article.slug === slug)
}

export function getArticlesByCategory(category: string): ImpartialArticle[] {
  return mockArticles.filter(article => 
    article.category.toLowerCase() === category.toLowerCase()
  )
}
