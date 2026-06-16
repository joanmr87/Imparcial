import Link from "next/link"
import { MessageCircle, Send, Share2 } from "lucide-react"
import type { ImpartialArticle } from "@/lib/types"

interface WhatsappBriefingProps {
  articles: ImpartialArticle[]
}

const WHATSAPP_URL =
  "https://wa.me/5492984388886?text=Hola%2C%20quiero%20recibir%20el%20resumen%20imparcial%20del%20dia%20por%20WhatsApp."

export function WhatsappBriefing({ articles }: WhatsappBriefingProps) {
  const briefingArticles = articles.slice(0, 5)

  return (
    <section className="mt-14 overflow-hidden rounded-[2rem] border border-[#b8cfc4] bg-[#ecf6f0] shadow-[0_24px_70px_rgba(36,73,55,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-[#173d31] px-6 py-8 text-white md:px-8">
          <p className="text-xs tracking-[0.22em] text-[#bfe3d2] uppercase">
            WhatsApp + web
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Recibí el resumen imparcial del día
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/78 md:text-base">
            Buenos días. Estas son las 5 noticias que más se repiten hoy entre medios
            argentinos, resumidas sin opinión.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#173d31] transition-colors hover:bg-[#d6ecdf]"
            >
              <MessageCircle className="h-4 w-4" />
              Sumarse por WhatsApp
            </a>
            <Link
              href="/metodologia"
              prefetch={false}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Send className="h-4 w-4" />
              Ver cómo se arma
            </Link>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-white/62">
            <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Si te sirvió para entender el día, reenviáselo a alguien que esté cansado del ruido.
          </p>
        </div>

        <div className="px-6 py-8 md:px-8">
          <p className="text-xs tracking-[0.22em] text-[#517263] uppercase">
            Modelo de edición diaria
          </p>
          <div className="mt-5 space-y-3">
            {briefingArticles.length > 0 ? (
              briefingArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/nota/${article.slug}`}
                  prefetch={false}
                  className="group grid grid-cols-[2rem_1fr] gap-3 rounded-[1.1rem] border border-[#c8ddd2] bg-white/72 px-4 py-3 transition-colors hover:bg-white"
                >
                  <span className="font-serif text-xl font-semibold text-[#93aa9e]">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold leading-snug text-[#173d31] group-hover:text-[#426d5a]">
                      {article.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#64786f] line-clamp-2">
                      {article.summary}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-[#c8ddd2] bg-white/72 px-5 py-5">
                <p className="text-sm font-semibold text-[#173d31]">
                  La edición diaria se activa cuando haya notas publicadas.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#64786f]">
                  El formato queda listo para convertir la portada en un resumen compartible.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
