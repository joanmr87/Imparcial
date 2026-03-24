import Link from "next/link"
import { ArticleCard } from "@/components/article-card"
import { ClickbaitBustersSection } from "@/components/clickbait-busters-section"
import { Header } from "@/components/header"
import { HomepageSectionBlock } from "@/components/homepage-section"
import { Separator } from "@/components/ui/separator"
import { getHomepageEdition } from "@/lib/homepage"
import { normalizeSectionSlug } from "@/lib/news-categories"

export const dynamic = "force-dynamic"

interface HomePageProps {
  searchParams?: Promise<{ seccion?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined
  const activeSection = normalizeSectionSlug(params?.seccion)
  const { articles, sections, activeSectionLabel } = await getHomepageEdition(activeSection)

  const featured = articles[0]
  const secondary = articles.slice(1, 3)
  const sidebar = articles.slice(3, 8)

  return (
    <div className="min-h-screen bg-background">
      <Header />

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
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Volver a la portada completa
              </Link>
            </div>
          </section>
        )}

        <section className="mb-8 rounded-[1.5rem] border border-border bg-card/30 px-5 py-4">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Como se hace esta edicion
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Diario generado íntegramente con IA. Toma información pública de distintos medios, cruza coberturas sobre el mismo hecho y publica una síntesis que busca reducir el sesgo de una sola mirada.
          </p>
        </section>

        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            {featured ? (
              <ArticleCard article={featured} variant="featured" />
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

            <Separator className="my-8" />

            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              {secondary.map(article => (
                <ArticleCard key={article.id} article={article} variant="large" />
              ))}
            </div>
          </div>

          <aside className="lg:border-l lg:border-border lg:pl-10">
            <p className="text-xs font-medium tracking-widest text-foreground uppercase">
              Edicion del momento
            </p>
            <Separator className="my-4" />
            <div className="flex flex-col gap-6">
              {sidebar.map(article => (
                <ArticleCard key={article.id} article={article} variant="small" />
              ))}
            </div>
          </aside>
        </div>

        <ClickbaitBustersSection />

        <section className="mt-16 border-t border-border pt-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Sobre Diario Imparcial
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Diario Imparcial es un diario generado íntegramente con IA a partir de múltiples coberturas sobre un mismo hecho. Cada síntesis ordena qué está confirmado, qué queda atribuido y en qué difieren los medios.
            </p>
            <div className="mt-6 flex items-center justify-center gap-8 text-xs text-muted-foreground">
              <div>
                <span className="block font-serif text-2xl font-semibold text-foreground">{articles.length}</span>
                <span>Temas visibles</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="block font-serif text-2xl font-semibold text-foreground">{sections.length}</span>
                <span>Secciones activas</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="block font-serif text-2xl font-semibold text-foreground">3x</span>
                <span>Actualizaciones diarias</span>
              </div>
            </div>
          </div>
        </section>

        {sections.map(section => (
          <HomepageSectionBlock key={section.slug} section={section} />
        ))}

        <section className="mt-16 rounded-[2rem] border border-border bg-card/40 px-6 py-8 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Que es El Imparcial
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
                Un diario para entender con rapidez qué pasó, a partir de varias coberturas
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Cuando una noticia importa de verdad, casi nunca aparece en un solo medio. El Imparcial toma
                varias coberturas, detecta qué cuentan sobre el mismo hecho y construye una síntesis periodística,
                más clara y más fácil de leer.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Todo el diario se produce con IA: desde la detección de coincidencias entre medios hasta la redacción de cada síntesis y la selección de los titulares clickbait que vale la pena desarmar.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                La idea no es borrar las diferencias entre diarios, sino exponerlas con orden: qué comparten,
                qué atribuye cada uno y en qué puntos no dicen lo mismo.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Como funciona
              </p>
              <ol className="mt-4 space-y-3 text-sm text-foreground/80">
                <li>1. Leemos varios diarios varias veces por día.</li>
                <li>2. Detectamos temas repetidos entre al menos dos medios.</li>
                <li>3. El sistema editorial arma una síntesis trazable a partir de esas coincidencias.</li>
                <li>4. La portada muestra solo síntesis generadas con IA desde varios medios, nunca links que te saquen del diario.</li>
              </ol>
              <Link
                href="/metodologia"
                className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                Ver la metodología completa
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
