import { ArrowUpRight } from "lucide-react"
import { ClickbaitCardImage } from "@/components/clickbait-card-image"
import type { ClickbaitBusterItem } from "@/lib/clickbait"

interface ClickbaitBustersProps {
  items: ClickbaitBusterItem[]
  generatedAt?: string
}

function answerClassName(answer: string): string {
  if (answer.length > 90) return "text-sm font-medium leading-snug md:text-base"
  if (answer.length > 55) return "text-base font-semibold leading-snug md:text-lg"
  return "text-2xl font-semibold leading-tight"
}

export function ClickbaitBusters({ items, generatedAt }: ClickbaitBustersProps) {
  const updatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleString("es-AR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : null

  return (
    <section className="mt-16 overflow-hidden rounded-[2rem] border border-stone-300/80 bg-[#f4efe7] text-stone-900 shadow-[0_24px_70px_rgba(28,28,28,0.07)]">
      <div className="border-b border-stone-300/70 bg-stone-950 px-6 py-6 text-stone-50 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs tracking-[0.22em] text-amber-200/90 uppercase">
              Anti clickbait
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">
              Te ahorramos el click
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-300">
              Titulares diseñados para obligarte a entrar, respondidos sin vueltas. Si la respuesta
              entra en una línea, te la damos en una línea.
            </p>
          </div>
          <div className="text-xs leading-relaxed text-stone-400 md:text-right">
            <p className="font-medium text-stone-300">
              {items.length > 0
                ? `${items.length} titulares resueltos en esta edición`
                : "Edición en preparación"}
            </p>
            <p className="mt-1">La gracia no es burlarse: es devolverte tiempo.</p>
            {updatedLabel && <p className="mt-1">Actualizada {updatedLabel}</p>}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 px-6 py-8 md:grid-cols-2 md:px-8 xl:grid-cols-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-stone-300 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,0,0,0.1)]"
            >
              <ClickbaitCardImage
                src={item.imageUrl}
                alt={item.title}
                source={item.source}
              />

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-stone-300 px-2.5 py-1 text-[11px] tracking-wide text-stone-600 uppercase">
                    {item.source}
                  </span>
                  <span className="font-serif text-sm font-semibold text-stone-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold leading-snug text-stone-900">
                  {item.title}
                </h3>

                <div className="mt-auto pt-5">
                  <div className="rounded-2xl bg-stone-950 px-4 py-3 text-stone-50">
                    <p className="text-[11px] tracking-[0.18em] text-amber-200/80 uppercase">
                      Lo que querías saber
                    </p>
                    <p className={`mt-2 line-clamp-4 text-pretty ${answerClassName(item.answer)}`}>
                      {item.answer}
                    </p>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-xs tracking-wide text-stone-500 underline-offset-4 transition-colors hover:text-stone-900 hover:underline"
                  >
                    Ver la nota original
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-6 py-10 md:px-8">
          <p className="text-xs tracking-widest text-stone-500 uppercase">
            Edición en preparación
          </p>
          <h3 className="mt-3 max-w-2xl font-serif text-2xl font-semibold text-stone-900">
            Estamos cazando los titulares anzuelo del día
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">
            La sección se completa sola en cuanto el sistema detecta titulares que esconden un dato
            concreto y puede verificar la respuesta en la nota. Volvé en un rato: la edición se
            renueva varias veces por día.
          </p>
        </div>
      )}
    </section>
  )
}
