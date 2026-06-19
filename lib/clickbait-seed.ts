import type { ClickbaitBusterItem } from "./clickbait"

// Bundled fallback edition for "Te ahorramos el click". This guarantees the
// section is NEVER empty, even on a cold start or if snapshot persistence is
// unavailable. It is only shown when there is nothing newer to read; the cron
// (refreshDailyClickbaitEdition) overwrites it with the live edition as soon as
// persistence works. Refresh it occasionally by harvesting a recent edition
// from /api/cron/ingest.
export const CLICKBAIT_SEED_ITEMS: ClickbaitBusterItem[] = [
  {
    id: "seed:minutouno:canasta-crianza",
    title:
      "Cuánto cuesta criar a un hijo según INDEC: la canasta de crianza ya supera los $500 mil por mes",
    answer: "676.431 pesos",
    source: "Minuto Uno",
    url: "https://www.minutouno.com/economia/cuanto-cuesta-criar-un-hijo-segun-indec-la-canasta-crianza-ya-supera-los-500-mil-mes-n6289454",
    rankingScore: 29.7,
  },
  {
    id: "seed:c5n:aguinaldo-comercio",
    title: "Cuándo cobran el aguinaldo los empleados de comercio en junio 2026",
    answer: "30 de junio de 2026",
    source: "C5N",
    url: "https://www.c5n.com/economia/cuando-cobran-el-aguinaldo-los-empleados-comercio-junio-2026-n241157",
    rankingScore: 27.5,
  },
  {
    id: "seed:iprofesional:record-exportaciones",
    title:
      "Nuevo récord de dólares por exportaciones mientras cae la importación: ¿cambio de modelo?",
    answer: "US$9.537 millones",
    source: "iProfesional",
    url: "https://www.iprofesional.com/economia/457736-nuevo-record-de-dolares-por-exportaciones-mientras-cae-la-importacion-cambio-de-modelo",
    imageUrl:
      "https://resizer.iproimg.com/unsafe/640x/https://assets.iprofesional.com/assets/jpg/2024/10/585084.jpg",
    rankingScore: 27.5,
  },
  {
    id: "seed:lanacion:casa-prefabricada",
    title:
      "Cuánto cuesta una casa prefabricada de 2 dormitorios, 1 baño y cocina en Argentina en junio 2026",
    answer: "9-20 millones de pesos",
    source: "La Nacion",
    url: "https://www.lanacion.com.ar/propiedades/casas-y-departamentos/cuanto-cuesta-una-casa-prefabricada-de-2-dormitorios-1-bano-y-cocina-en-argentina-en-junio-2026-nid12062026/",
    imageUrl:
      "https://resizer.glanacion.com/resizer/v2/VHQFEU6YNFACDOIQLQMDMYEWJI.jpg?auth=e65e304eec6f405ab0b35d4e235f697f126df44dd871e34b7fbb1077b4113796&smart=true&width=2000&height=1333",
    rankingScore: 26.8,
  },
  {
    id: "seed:iprofesional:nuevo-outlet",
    title: "Adiós al clásico shopping: así será el nuevo outlet con marcas y descuentos",
    answer: "Oeste Outlet",
    source: "iProfesional",
    url: "https://www.iprofesional.com/negocios/457784-adios-al-clasico-shopping-asi-sera-el-nuevo-outlet-con-marcas-y-descuentos",
    imageUrl:
      "https://resizer.iproimg.com/unsafe/640x/https://assets.iprofesional.com/assets/jpg/2026/03/614301.jpg",
    rankingScore: 25.7,
  },
  {
    id: "seed:perfil:dolar-hoy",
    title: "A cuánto cotiza el dólar hoy, viernes 19 de junio de 2026",
    answer: "Dólar blue: compra 1.465, venta 1.485",
    source: "Perfil",
    url: "https://www.perfil.com/noticias/economia/a-cuanto-cotiza-el-dolar-hoy-viernes-19-de-junio-de-2026.phtml",
    imageUrl:
      "https://fotos.perfil.com/2025/09/19/trim/540/304/suba-del-dolar-19092025-2102251.jpg",
    rankingScore: 25.7,
  },
  {
    id: "seed:ambito:dolar-oficial-salto",
    title: "El dólar oficial ya acumula un salto del 3% en junio: ¿por qué sube y qué anticipa el mercado?",
    answer: "1.451 pesos",
    source: "Ambito",
    url: "https://www.ambito.com/finanzas/el-dolar-oficial-ya-acumula-un-salto-del-3-junio-por-que-sube-y-que-anticipa-el-mercado-n6290295",
    rankingScore: 25,
  },
  {
    id: "seed:c5n:austria-lesion",
    title:
      "Mundial 2026: una figura clave de Austria se fracturó y podría perderse el partido contra la Selección argentina",
    answer: "Stefan Posch",
    source: "C5N",
    url: "https://www.c5n.com/deportes/mundial-2026-una-figura-clave-austria-se-fracturo-y-podria-perderse-el-partido-contra-la-seleccion-argentina-n241186",
    rankingScore: 24.7,
  },
]
