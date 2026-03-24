import { Header } from "@/components/header"
import { ArticleCard } from "@/components/article-card"
import { mockArticles } from "@/lib/mock-data"
import { Separator } from "@/components/ui/separator"
import { listPublishedArticles } from "@/lib/articles"
import Link from "next/link"
import { getClickbaitBusters } from "@/lib/clickbait"
import { ClickbaitBusters } from "@/components/clickbait-busters"

export const revalidate = 1800

export default async function HomePage() {
  const { articles } = await listPublishedArticles()
  const clickbaitBusters = await getClickbaitBusters()
  
  // Fallback to mock if no articles in DB
  const displayArticles = articles.length > 0 ? articles : mockArticles
  
  const featured = displayArticles[0]
  const secondary = displayArticles.slice(1, 3)
  const sidebar = displayArticles.slice(3)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Main grid layout */}
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          {/* Main column - Featured + Secondary */}
          <div className="lg:col-span-2">
            {/* Featured article */}
            <ArticleCard article={featured} variant="featured" />
            
            <Separator className="my-8" />

            {/* Secondary articles */}
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              {secondary.map((article) => (
                <ArticleCard key={article.id} article={article} variant="large" />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:border-l lg:border-border lg:pl-10">
            <p className="text-xs font-medium tracking-widest text-foreground uppercase">
              Mas notas
            </p>
            <Separator className="my-4" />
            <div className="flex flex-col gap-6">
              {sidebar.map((article) => (
                <ArticleCard key={article.id} article={article} variant="small" />
              ))}
            </div>
          </aside>
        </div>

        {/* About section */}
        <section className="mt-16 border-t border-border pt-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Sobre Diario Imparcial
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Cada nota que publicamos es el resultado de analizar la misma noticia en 3 a 7 medios argentinos diferentes. Utilizamos inteligencia artificial para extraer los hechos, separar las opiniones y mostrar las discrepancias entre fuentes. Nuestro objetivo es que puedas informarte sin sesgo editorial.
            </p>
            <div className="mt-6 flex items-center justify-center gap-8 text-xs text-muted-foreground">
              <div>
                <span className="block font-serif text-2xl font-semibold text-foreground">7+</span>
                <span>Medios analizados</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="block font-serif text-2xl font-semibold text-foreground">100%</span>
                <span>Transparencia</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="block font-serif text-2xl font-semibold text-foreground">0</span>
                <span>Adjetivos</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] border border-border bg-card/40 px-6 py-8 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Que es El Imparcial
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
                Un diario hecho para leer lo importante sin casarte con una sola voz
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Cuando una noticia importa de verdad, casi nunca aparece en un solo medio. El Imparcial toma
                varias coberturas, detecta qué cuentan sobre el mismo hecho y construye una versión nueva,
                más clara y más fácil de leer.
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
                <li>2. Agrupamos notas sobre el mismo acontecimiento.</li>
                <li>3. La IA ordena hechos, atribuciones y discrepancias.</li>
                <li>4. Publicamos una versión nueva con trazabilidad visible.</li>
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

        <ClickbaitBusters items={clickbaitBusters} />
      </main>

      {/* Footer */}
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
              Las notas son generadas por IA bajo reglas editoriales publicas.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
