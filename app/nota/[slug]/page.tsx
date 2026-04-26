import Image from "next/image"
import { notFound } from "next/navigation"
import Link from "next/link"
import { EditorialPromise } from "@/components/editorial-promise"
import { Header } from "@/components/header"
import { TransparencyPanel } from "@/components/transparency-panel"
import { findPublishedArticleBySlug, listPublishedArticles } from "@/lib/articles"
import { getGeneratedEditorialStock } from "@/lib/editorial-stock"
import { formatArgentinaLongDate } from "@/lib/date-format"
import { Separator } from "@/components/ui/separator"

export const revalidate = 1800

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const [published, generated] = await Promise.allSettled([
    listPublishedArticles(),
    getGeneratedEditorialStock(),
  ])
  const slugs = new Set<string>()

  if (published.status === "fulfilled") {
    for (const article of published.value.articles) {
      if (article.slug) slugs.add(article.slug)
    }
  }

  if (generated.status === "fulfilled") {
    for (const article of generated.value) {
      if (article.slug) slugs.add(article.slug)
    }
  }

  return [...slugs].map(slug => ({ slug }))
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  
  const { article } = await findPublishedArticleBySlug(slug)
  const dateString = formatArgentinaLongDate()

  if (!article) {
    notFound()
  }

  const formattedDate = new Date(article.createdAt).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const sourceCount = article.sources?.length || article.sourceCount || 3
  const sourceTags = [...new Set((article.sources || []).map(source => source.name))]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(214,203,184,0.18),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(250,247,241,0.94))]">
      <Header dateString={dateString} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <section className="mb-8 rounded-[1.5rem] border border-border bg-card/70 px-5 py-4 shadow-[0_12px_30px_rgba(28,28,28,0.04)]">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Que estas leyendo
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            Esta nota es una sintesis editorial generada con IA a partir de varias coberturas sobre el mismo hecho.
            Busca bajar el peso de una sola linea editorial y separar mejor hechos, atribuciones y diferencias.
          </p>
          <EditorialPromise centered={false} compact />
        </section>

        {/* Breadcrumb */}
        <nav className="mb-8 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span>{article.category}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          {/* Main content */}
          <article className="lg:col-span-2">
            <header className="mb-10">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                {article.category}
              </p>

              <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-foreground md:text-4xl lg:text-5xl text-balance">
                {article.title}
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
                {article.summary}
              </p>

              <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
                <time dateTime={article.createdAt}>{formattedDate}</time>
                <span className="text-border">|</span>
                <span>{sourceCount} fuentes</span>
              </div>

              {sourceTags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {sourceTags.map(source => (
                    <span
                      key={source}
                      className="rounded-full border border-border px-3 py-1 text-[11px] tracking-wide text-muted-foreground"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {article.heroImageUrl && (
              <div className="mb-10 overflow-hidden rounded-[1.75rem] border border-border/80 bg-muted shadow-[0_18px_44px_rgba(28,28,28,0.06)]">
                <Image
                  src={article.heroImageUrl}
                  alt={article.title}
                  width={1600}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                  className="aspect-[16/9] h-full w-full object-cover"
                />
              </div>
            )}

            <Separator className="mb-10" />

            <div className="rounded-[1.75rem] border border-border/70 bg-card/80 px-5 py-6 shadow-[0_18px_40px_rgba(28,28,28,0.04)] md:px-8 md:py-8">
              {(article.content || '').split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <h3 key={index} className="mt-10 mb-4 font-serif text-xl font-semibold text-foreground">
                      {paragraph.replace(/\*\*/g, '')}
                    </h3>
                  )
                }
                if (paragraph.includes(':**')) {
                  const parts = paragraph.split(':**')
                  return (
                    <div key={index} className="mt-8 mb-4">
                      <h4 className="font-semibold text-foreground mb-2">
                        {parts[0].replace(/\*\*/g, '')}
                      </h4>
                      {parts[1] && (
                        <p className="text-foreground/80 leading-relaxed">
                          {parts[1].replace(/\*\*/g, '')}
                        </p>
                      )}
                    </div>
                  )
                }
                if (paragraph.startsWith('- ')) {
                  return (
                    <ul key={index} className="my-6 space-y-3">
                      {paragraph.split('\n').map((item, itemIndex) => (
                        <li 
                          key={itemIndex} 
                          className="flex gap-3 text-foreground/80 leading-relaxed"
                        >
                          <span className="text-muted-foreground select-none">—</span>
                          <span>{item.replace('- ', '')}</span>
                        </li>
                      ))}
                    </ul>
                  )
                }
                return (
                  <p key={index} className="my-5 text-foreground/80 leading-relaxed">
                    {paragraph}
                  </p>
                )
              })}
            </div>
          </article>

          <aside className="lg:border-l lg:border-border lg:pl-10">
            <div className="lg:sticky lg:top-8">
              <TransparencyPanel article={article} />
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="text-center">
            <Link href="/" className="font-serif text-lg font-semibold text-foreground hover:text-muted-foreground transition-colors">
              Diario Imparcial
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              La noticia, sin adjetivos.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
