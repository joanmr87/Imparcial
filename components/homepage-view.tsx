import Link from "next/link"
import { Suspense } from "react"
import { ArticleCard } from "@/components/article-card"
import { ClickbaitBustersSection } from "@/components/clickbait-busters-section"
import { Header } from "@/components/header"
import { HomepageSectionBlock } from "@/components/homepage-section"
import { LegacySectionRedirect } from "@/components/legacy-section-redirect"
import { getPublishedClickbaitEdition } from "@/lib/clickbait"
import { formatArgentinaLongDate } from "@/lib/date-format"
import { getHomepageEdition } from "@/lib/homepage"

interface HomepageViewProps {
  activeSection?: string | null
  enableLegacySectionRedirect?: boolean
}

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
  const sidebar = articles.slice(3, 8)
  const remainingSections = activeSection ? [] : sections

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
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  {activeSectionLabel || sections[0]?.label || "Seccion"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Una edicion enfocada en esa agenda, armada solo con sintesis construidas desde varias coberturas.
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
          <section className="mb-8 rounded-[1.5rem] border border-border bg-card/70 px-5 py-5 shadow-[0_12px_34px_rgba(28,28,28,0.04)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Una portada para entender rapido
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80 md:text-base">
                  Cada sintesis junta varias coberturas sobre el mismo hecho, separa coincidencias de ruido editorial
                  y te devuelve una version mas clara para leer sin abrir cinco diarios.
                </p>
              </div>
              <Link
                href="/metodologia"
                prefetch={false}
                className="inline-flex rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                Ver metodologia
              </Link>
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
                Lo mas importante de la edicion
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
                Seccion en actualizacion
              </p>
              <h3 className="mt-3 font-serif text-2xl font-semibold text-foreground">
                {activeSectionLabel || "Esta sección"} todavía no tiene cruces suficientes entre medios
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                El diario publica esta vista solo cuando encuentra varias coberturas sobre un mismo tema. En cuanto entren coincidencias reales, la sección se completa sola.
              </p>
            </section>
          ) : null}
        </section>

        <ClickbaitBustersSection
          items={clickbaitEdition.items}
          generatedAt={clickbaitEdition.generatedAt}
        />

        {sidebar.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Edicion del momento
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
                  Mas sintesis para seguir leyendo
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
                Como funciona
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
                Un diario que no te pide fe: te muestra de donde sale cada sintesis
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Imparcial no reemplaza a los medios: los lee en conjunto, detecta cuando hablan del mismo hecho
                y publica una version mas ordenada, mas corta y menos arrastrada por una sola linea editorial.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                La promesa no es una verdad magica. Es algo mas util: mostrar coincidencias, marcar diferencias
                y dejarte ver rapido que esta mas firme y que todavia esta en disputa.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Metodo editorial
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
                Ver la metodologia completa
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="font-serif text-lg font-semibold text-foreground">
                Diario Imparcial
              </p>
              <p className="text-xs text-muted-foreground">
                La noticia, sin adjetivos.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Diario generado íntegramente con IA y reglas públicas de trazabilidad editorial.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
