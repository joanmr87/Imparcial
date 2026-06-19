import Link from "next/link"
import { MessageCircle, Share2 } from "lucide-react"
import type { ImpartialArticle } from "@/lib/types"

interface WhatsappBriefingProps {
  articles: ImpartialArticle[]
}

const WHATSAPP_URL =
  "https://wa.me/5492984388886?text=Hola%2C%20quiero%20recibir%20el%20resumen%20imparcial%20del%20dia%20por%20WhatsApp."

export function WhatsappBriefing({ articles }: WhatsappBriefingProps) {
  const briefingArticles = articles.slice(0, 5)

  return (
    <section className="mt-14 overflow-hidden rounded-[2rem] border border-stone-300/80 bg-[#f4efe7] text-stone-900 shadow-[0_24px_70px_rgba(28,28,28,0.07)]">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-stone-950 px-6 py-8 text-stone-50 md:px-8 md:py-10">
          <p className="text-xs tracking-[0.22em] text-emerald-300/90 uppercase">
            El día en un mensaje
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Recibí la edición del día por WhatsApp
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-300 md:text-base">
            Una vez por día, las noticias que más se repiten entre los diarios argentinos,
            resumidas sin opinión. Para entender el día en dos minutos, sin abrir cinco pestañas.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-emerald-400"
            >
              <MessageCircle className="h-4 w-4" />
              Sumarme por WhatsApp
            </a>
            <Link
              href="/metodologia"
              prefetch={false}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-700 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Ver cómo se arma
            </Link>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-stone-400">
            <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Si te sirvió para entender el día, reenviáselo a alguien cansado del ruido.
          </p>
        </div>

        <div className="px-6 py-8 md:px-8 md:py-10">
          <p className="text-xs tracking-[0.22em] text-stone-500 uppercase">
            Así se ve la edición
          </p>
          <div className="mt-5 space-y-3">
            {briefingArticles.length > 0 ? (
              briefingArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/nota/${article.slug}`}
                  prefetch={false}
                  className="group grid grid-cols-[2rem_1fr] gap-3 rounded-[1.1rem] border border-stone-300/70 bg-white/70 px-4 py-3 transition-colors hover:bg-white"
                >
                  <span className="font-serif text-xl font-semibold text-stone-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold leading-snug text-stone-900 group-hover:text-stone-600">
                      {article.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-stone-600 line-clamp-2">
                      {article.summary}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-stone-300/70 bg-white/70 px-5 py-5">
                <p className="text-sm font-semibold text-stone-900">
                  La edición diaria se activa cuando hay notas publicadas.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  El formato ya queda listo para convertir la portada en un resumen compartible.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
