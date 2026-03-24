import { Header } from "@/components/header"
import { ArticleCard } from "@/components/article-card"
import { mockArticles } from "@/lib/mock-data"
import { Separator } from "@/components/ui/separator"
import { listPublishedArticles } from "@/lib/articles"

export default async function HomePage() {
  const { articles } = await listPublishedArticles()
  
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
