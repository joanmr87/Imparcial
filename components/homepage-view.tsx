import Link from "next/link"
import { Suspense } from "react"
import { ArticleCard } from "@/components/article-card"
import { ClickbaitBustersSection } from "@/components/clickbait-busters-section"
import { Header } from "@/components/header"
import { HomepageSectionBlock } from "@/components/homepage-section"
import { LegacySectionRedirect } from "@/components/legacy-section-redirect"
import { SiteFooter } from "@/components/site-footer"
import { WhatsappBriefing } from "@/components/whatsapp-briefing"
import { getPublishedClickbaitEdition } from "@/lib/clickbait"
import { formatArgentinaLongDate } from "@/lib/date-format"
import { getHomepageEdition } from "@/lib/homepage"
import { categoryDisplayLabel } from "@/lib/news-categories"
import type { ImpartialArticle } from "@/lib/types"

interface HomepageViewProps {
  activeSection?: string | null
  enableLegacySectionRedirect?: boolean
}

function latestArticleSignalLabel(articles: ImpartialArticle[]): string | null {
  const latestTimestamp = articles
    .flatMap(article => [
      article.updatedAt,
      article.createdAt,
      ...article.sources.map(source => source.publishedAt),
    ])
    .map(value => new Date(value).getTime())
    .filter(value => Number.isFinite(value))
    .sort((left, right) => right - left)[0]

  if (!latestTimestamp) return null

  return new Date(latestTimestamp).toLocaleString("es-AR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

function distinctSourceCount(articles: ImpartialArticle[]): number {
  return new Set(
    articles.flatMap(article => article.sources.map(source => source.name))
  ).size
}

const manifestoPillars = [
  {
    title: "Sin bajada de línea",
    body: "Ninguna nota nace de un solo diario. Cruzamos varias coberturas del mismo hecho y separamos lo que pasó del ruido editorial.",
  },
  {
    title: "Trazable",
    body: "Cada nota muestra de qué medios salió la información, qué está confirmado y qué todavía está en disputa.",
  },
  {
    title: "Te devuelve tiempo",
    body: "Una versión clara y corta en lugar de abrir cinco diarios para entender la misma noticia.",
  },
]

export async function HomepageView({
  activeSection,
  enableLegacySectionRedirect = false,
}: HomepageViewProps) {
  const dateString = formatArgentinaLongDate()
  const [{ articles, sections, activeSectionLabel }, clickbaitEdition] = await Promise.all([
    getHomepageEdition(activeSection),
    getPublishedClickbaitEdition(),
  ])

  const featured = articles[0]
  const secondary = articles.slice(1, 3)
  const sidebar = articles.slice(3, 12)
  const remainingSections = activeSection ? [] : sections
  const sourceCount = distinctSourceCount(articles)
  const latestSignalLabel = latestArticleSignalLabel(articles)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(214,203,184,0.22),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(250,247,241,0.96))]">
      {enableLegacySectionRedirect && (
        <Suspense fallback={null}>
          <LegacySectionRedirect />
        </Suspense>
      )}

      <Header dateString={dateString} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        {activeSection && (
          <section className="mb-8 rounded-[1.5rem] border border-border bg-card/40 px-5 py-4">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Vista filtrada
            </p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="font-serif text-2xl font-semibold text-foreground">
                  {categoryDisplayLabel(activeSectionLabel || sections[0]?.label || "Sección")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Una edición enfocada en esa agenda, armada solo con síntesis construidas desde varias coberturas.
                </p>
              </div>
              <Link
                href="/"
                prefetch={false}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Volver a la portada completa
              </Link>
            </div>
          </section>
        )}

        {!activeSection && (
          <section className="mb-10 overflow-hidden rounded-[2rem] border border-border bg-card/70 shadow-[0_18px_44px_rgba(28,28,28,0.05)]">
            <div className="px-6 py-9 md:px-10 md:py-11">
              <p className="text-[11px] font-medium tracking-[0.28em] text-muted-foreground uppercase">
                Diario Imparcial · Periodismo sin bajada de línea
              </p>
              <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold leading-[1.08] text-foreground md:text-5xl text-balance">
                Leemos todos los diarios para que vos leas la noticia
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
                Cada nota cruza la cobertura de varios medios argentinos sobre el mismo hecho, separa lo
                confirmado del ruido editorial y te deja una versión clara y corta, con las fuentes a la
                vista. Las conclusiones las sacás vos.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/metodologia"
                  prefetch={false}
                  className="inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/85"
                >
                  Cómo lo hacemos
                </Link>
                {articles.length > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {articles.length} síntesis
                    {sourceCount > 1 ? ` · ${sourceCount} medios cruzados` : ""}
                    {latestSignalLabel ? ` · actualizada ${latestSignalLabel}` : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-px border-t border-border/70 bg-border/50 md:grid-cols-3">
              {manifestoPillars.map(pillar => (
                <div key={pillar.title} className="bg-card/80 px-6 py-5 md:px-8 md:py-6">
                  <p className="font-serif text-base font-semibold text-foreground">{pillar.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {pillar.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}


        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Titulares principales
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
                Lo más importante de la edición
              </h2>
            </div>
          </div>

          {featured ? (
            <div className="space-y-8">
              <ArticleCard article={featured} variant="featured" />
              <div className="grid gap-8 md:grid-cols-2 md:gap-10">
                {secondary.map(article => (
                  <ArticleCard key={article.id} article={article} variant="large" />
                ))}
              </div>
            </div>
          ) : activeSection ? (
            <section className="rounded-[1.5rem] border border-border bg-card/30 px-6 py-8">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Sección en actualización
              </p>
              <h3 className="mt-3 font-serif text-2xl font-semibold text-foreground">
                {categoryDisplayLabel(activeSectionLabel || "Esta sección")} todavía no tiene cruces suficientes entre medios
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                El diario publica esta vista solo cuando encuentra varias coberturas sobre un mismo tema. En cuanto entren coincidencias reales, la sección se completa sola.
              </p>
            </section>
          ) : (
            <section className="rounded-[1.5rem] border border-border bg-card/30 px-6 py-8">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Edición en actualización
              </p>
              <h3 className="mt-3 font-serif text-2xl font-semibold text-foreground">
                Todavía no hay suficientes cruces frescos entre medios
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                La portada se publica cuando encuentra coberturas recientes sobre un mismo hecho.
                Preferimos esperar una edición confiable antes que rellenar con noticias viejas.
              </p>
            </section>
          )}
        </section>

        <ClickbaitBustersSection
          items={clickbaitEdition.items}
          generatedAt={clickbaitEdition.generatedAt}
        />

        {!activeSection && articles.length > 0 && <WhatsappBriefing articles={articles} />}

        {sidebar.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Edición del momento
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
                  Más síntesis para seguir leyendo
                </h2>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sidebar.map(article => (
                <ArticleCard key={article.id} article={article} variant="small" />
              ))}
            </div>
          </section>
        )}

        {remainingSections.map(section => (
          <HomepageSectionBlock key={section.slug} section={section} />
        ))}

        <section className="mt-16 rounded-[2rem] border border-border bg-card/65 px-6 py-8 shadow-[0_22px_60px_rgba(29,29,29,0.05)] md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Cómo funciona
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
                Un diario que no te pide fe: te muestra de dónde sale cada síntesis
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Imparcial no reemplaza a los medios: los lee en conjunto, detecta cuándo hablan del mismo hecho
                y publica una versión más ordenada, más corta y menos arrastrada por una sola línea editorial.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                La promesa no es una verdad mágica. Es algo más útil: mostrar coincidencias, marcar diferencias
                y dejarte ver rápido qué está más firme y qué todavía está en disputa.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Método editorial
              </p>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/80">
                <li>1. Leemos varios diarios varias veces por día.</li>
                <li>2. Detectamos temas repetidos entre al menos dos medios.</li>
                <li>3. El sistema editorial arma una síntesis trazable a partir de esas coincidencias.</li>
                <li>4. En cada nota mostramos fuentes, puntos firmes y diferencias para que sepas qué estás leyendo.</li>
              </ol>
              <Link
                href="/metodologia"
                prefetch={false}
                className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                Ver la metodología completa
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
