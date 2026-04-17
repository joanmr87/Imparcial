import Link from "next/link"
import { Header } from "@/components/header"
import { formatArgentinaLongDate } from "@/lib/date-format"
import { Separator } from "@/components/ui/separator"

const promises = [
  "No parte de una sola voz: cada nota nace del cruce de varios medios.",
  "Distingue entre hechos compartidos, datos atribuidos y puntos en disputa.",
  "Muestra de qué diarios salió la información para que el lector pueda revisar el origen.",
  "Se genera íntegramente con IA, pero con trazabilidad sobre cada fuente utilizada.",
]

const steps = [
  {
    title: "1. Escuchamos a varios diarios a la vez",
    body:
      "El Imparcial revisa fuentes periodísticas conocidas varias veces por día. En lugar de elegir una sola cobertura, junta distintas miradas sobre el mismo hecho.",
  },
  {
    title: "2. Detectamos cuándo todos están hablando de lo mismo",
    body:
      "Si varios medios cubren una misma noticia, el sistema las agrupa. Así evitamos mezclar temas distintos y podemos ver dónde coinciden y dónde se separan.",
  },
  {
    title: "3. La IA ordena el caos",
    body:
      "Con esas coberturas sobre la mesa, la IA arma una síntesis periodística: más limpia, más clara y sin el ruido que suele meter cada línea editorial.",
  },
  {
    title: "4. La nota muestra su cocina",
    body:
      "Cada artículo explica cuántas fuentes participaron y de qué medios vino la información. La promesa no es esconder el proceso, sino abrirlo.",
  },
]

export default function MethodologyPage() {
  const dateString = formatArgentinaLongDate()

  return (
    <div className="min-h-screen bg-background">
      <Header dateString={dateString} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <section className="max-w-3xl">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Que es El Imparcial
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground md:text-5xl">
            Un diario que no te pide fe: te muestra cómo llegó a cada nota
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            El Imparcial nace de una idea simple y potente: si una noticia importante aparece en varios
            diarios, no deberías tener que elegir una sola versión para entender qué pasó.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Entonces hacemos algo distinto. Escuchamos varias coberturas, cruzamos lo que dicen,
            separamos coincidencias de diferencias y publicamos una síntesis periodística, pensada para leer mejor,
            entender más rápido y depender menos de la mirada de un solo medio.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Todo el proceso está generado con IA: la detección de coincidencias entre medios, la comparación de enfoques,
            la redacción de las síntesis y la selección de la información más útil para portada.
          </p>
        </section>

        <Separator className="my-10" />

        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Como funciona, sin tecnicismos
            </h2>
            <div className="mt-6 space-y-6">
              {steps.map(step => (
                <article key={step.title} className="rounded-2xl border border-border bg-card/40 p-5">
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              La promesa editorial
            </h2>
            <ul className="mt-6 space-y-4">
              {promises.map(item => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
                  <span className="text-muted-foreground">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-border bg-secondary/40 p-5">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                La idea de fondo
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                No queremos reemplazar a los medios: queremos leerlos todos por vos, encontrar el
                corazón de la noticia y devolvértelo en un formato más claro.
              </p>
            </div>

            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                Volver a la portada
              </Link>
            </div>
          </div>
        </section>

        <Separator className="my-10" />

        <section className="max-w-3xl">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Qué significa “sin adjetivos”
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            No significa escribir frío. Significa no empujar una conclusión por vos. Si un medio califica
            una medida, una persona o una decisión, esa calificación aparece atribuida a esa fuente.
            La voz del diario se concentra en ordenar el hecho, no en cargarlo de opinión.
          </p>
        </section>
      </main>
    </div>
  )
}
