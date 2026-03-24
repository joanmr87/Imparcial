import type { ClickbaitBusterItem } from "@/lib/clickbait"

interface ClickbaitBustersProps {
  items: ClickbaitBusterItem[]
}

export function ClickbaitBusters({ items }: ClickbaitBustersProps) {
  if (items.length === 0) return null

  return (
    <section className="mt-16 rounded-[2rem] border border-border bg-[#f4efe7] px-6 py-8 text-stone-900 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
            Anti Clickbait
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">
            Te ahorramos el click
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">
            Titulares hechos para obligarte a entrar, respondidos sin vueltas. Si la respuesta entra en una línea,
            te la damos en una línea.
          </p>
        </div>
        <p className="text-xs tracking-wide text-stone-500">
          La gracia no es burlarse: es devolverte tiempo.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(item => (
          <article
            key={item.id}
            className="overflow-hidden rounded-[1.5rem] border border-stone-300 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
          >
            {item.imageUrl && (
              <div className="aspect-[16/9] overflow-hidden bg-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-stone-300 px-2.5 py-1 text-[11px] tracking-wide text-stone-600 uppercase">
                  {item.source}
                </span>
                <span className="text-[11px] tracking-wide text-stone-400 uppercase">
                  respuesta corta
                </span>
              </div>

              <h3 className="mt-4 text-base font-semibold leading-snug text-stone-900">
                {item.title}
              </h3>

              <div className="mt-5 rounded-2xl bg-stone-950 px-4 py-3 text-stone-50">
                <p className="text-[11px] tracking-[0.18em] text-stone-400 uppercase">
                  Lo que querías saber
                </p>
                <p className="mt-2 line-clamp-2 text-2xl font-semibold leading-tight text-pretty">
                  {item.answer}
                </p>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex text-xs tracking-wide text-stone-500 underline-offset-4 hover:underline"
              >
                Ver la nota original
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
