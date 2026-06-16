import { BadgeCheck, Megaphone, Radar, Sparkles } from "lucide-react"

const proofPoints = [
  {
    icon: Radar,
    title: "Cruza versiones",
    body: "La noticia no sale de una sola cobertura: el sistema agrupa varios medios que hablan del mismo hecho.",
  },
  {
    icon: BadgeCheck,
    title: "Muestra fuentes",
    body: "Cada nota deja visible de dónde salió la información, qué está confirmado y qué sigue abierto.",
  },
  {
    icon: Sparkles,
    title: "Usa IA con método",
    body: "La IA compara, ordena y sintetiza. La propuesta editorial es transparencia, no automatización ciega.",
  },
]

const audienceArguments = [
  {
    label: "Para lectores",
    text: "No tenés que abrir cinco diarios para entender qué pasó.",
  },
  {
    label: "Para anunciantes",
    text: "Llegamos a lectores que buscan información confiable, no consumo impulsivo de titulares.",
  },
  {
    label: "Para alianzas",
    text: "Imparcial no compite con los medios fuente: los ordena, los cita y amplía su circulación.",
  },
]

const weeklyPlan = [
  "Semana 1: manifiesto, bio pública y plantilla diaria de WhatsApp.",
  "Semana 2: resumen diario con 5 noticias y medición de clics/reenvíos.",
  "Semana 3: carruseles con los hooks sin grieta, en 2 minutos y que coinciden los medios.",
  "Semana 4: landing de captación con ejemplos reales y botón directo a WhatsApp.",
]

export function PositioningSections() {
  return (
    <>
      <section className="mt-16">
        <div className="max-w-3xl">
          <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
            Por qué existe
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-foreground md:text-4xl">
            Menos ruido. Más contexto. Fuentes a la vista.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Diario Imparcial es un medio hecho con IA que cruza noticias de distintos diarios
            argentinos para darte una versión más clara, corta y verificable de lo que pasó.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {proofPoints.map(point => {
            const Icon = point.icon

            return (
              <article
                key={point.title}
                className="rounded-[1.35rem] border border-border bg-card/68 px-5 py-5 shadow-[0_12px_32px_rgba(28,28,28,0.035)]"
              >
                <Icon className="h-5 w-5 text-foreground/72" />
                <h3 className="mt-4 font-serif text-xl font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {point.body}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-16 rounded-[2rem] border border-border bg-[#fbfaf6] px-6 py-8 shadow-[0_22px_60px_rgba(29,29,29,0.05)] md:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
              Argumentos de marca
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
              Imparcial no promete una verdad perfecta: muestra cómo se construyó la síntesis
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              El enemigo no son otros medios. Es la confusión, la grieta, el clickbait y la pérdida
              de tiempo. La marca crece cuando ayuda a explicar mejor el día sin pedir fe.
            </p>
          </div>

          <div className="space-y-3">
            {audienceArguments.map(argument => (
              <div
                key={argument.label}
                className="rounded-[1.15rem] border border-border bg-white/72 px-4 py-4"
              >
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  {argument.label}
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/85">
                  {argument.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-8 rounded-[2rem] border border-[#d7d0c3] bg-[#f4efe7] px-6 py-8 md:px-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">
            Plan de crecimiento
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-stone-950">
            30 días para instalar el hábito
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-600 md:text-base">
            La prioridad es construir audiencia propia antes que monetización inmediata: WhatsApp
            para recurrencia, web para confianza y redes para descubrimiento.
          </p>
        </div>

        <div className="space-y-3">
          {weeklyPlan.map((item, index) => (
            <div key={item} className="flex gap-3 rounded-[1.15rem] bg-white/70 px-4 py-3">
              <span className="font-serif text-xl font-semibold text-stone-400">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-stone-700">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-y border-border py-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
              Test de validacion
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground">
              La frase que debería recordar el lector
            </h2>
          </div>
          <div className="max-w-xl rounded-[1.25rem] bg-foreground px-5 py-4 text-background">
            <Megaphone className="h-5 w-5 text-background/70" />
            <p className="mt-3 font-serif text-xl font-semibold leading-snug">
              Es el diario que cruza varios medios y te resume sin opinión.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
