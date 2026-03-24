import { Header } from "@/components/header"
import { Separator } from "@/components/ui/separator"

const principles = [
  "Cada nota parte de varias coberturas sobre el mismo hecho, no de una sola fuente.",
  "Los hechos coincidentes se separan de los datos atribuidos y de las discrepancias.",
  "Las citas y versiones contrapuestas se mantienen visibles para el lector.",
  "La automatizacion no reemplaza la trazabilidad: cada nota debe mostrar de donde sale.",
]

const pipeline = [
  "Recoleccion automatica de feeds y fuentes verificadas.",
  "Agrupamiento de noticias sobre el mismo acontecimiento.",
  "Extraccion de hechos, citas y divergencias con IA.",
  "Generacion de una nota neutral y estructurada.",
  "Publicacion y auditoria del resultado.",
]

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <section>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Metodologia
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground md:text-5xl">
            Como trabaja Diario Imparcial
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Diario Imparcial busca cubrir la actualidad argentina sin editorializar el hecho central.
            La meta no es ocultar diferencias entre medios, sino exponerlas de forma legible y trazable.
          </p>
        </section>

        <Separator className="my-10" />

        <section className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Principios editoriales
            </h2>
            <ul className="mt-5 space-y-4">
              {principles.map(principle => (
                <li key={principle} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
                  <span className="text-muted-foreground">01</span>
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Pipeline
            </h2>
            <ul className="mt-5 space-y-4">
              {pipeline.map(step => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
                  <span className="text-muted-foreground">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Separator className="my-10" />

        <section className="max-w-2xl">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Que significa “sin adjetivos”
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Significa evitar valoraciones sobre el hecho principal. Si una fuente califica una medida,
            una decision o una persona, esa caracterizacion aparece atribuida a la fuente, no como voz del diario.
          </p>
        </section>
      </main>
    </div>
  )
}
