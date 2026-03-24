import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { TransparencyPanel } from "@/components/transparency-panel"
import { findPublishedArticleBySlug } from "@/lib/articles"
import { Separator } from "@/components/ui/separator"

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return []
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  
  const { article } = await findPublishedArticleBySlug(slug)

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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-10">
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
            {/* Header */}
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

            <Separator className="mb-10" />

            {/* Article content */}
            <div className="prose-custom">
              {(article.content || '').split('\n\n').map((paragraph, index) => {
                // Handle bold headings
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <h3 key={index} className="mt-10 mb-4 font-serif text-xl font-semibold text-foreground">
                      {paragraph.replace(/\*\*/g, '')}
                    </h3>
                  )
                }
                // Handle section headers with colons
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
                // Handle list items
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
                // Regular paragraph
                return (
                  <p key={index} className="my-5 text-foreground/80 leading-relaxed">
                    {paragraph}
                  </p>
                )
              })}
            </div>

            {/* Editorial note */}
            <div className="mt-14 border-t border-border pt-8">
              <p className="text-xs tracking-widest text-muted-foreground uppercase mb-3">
                Nota de transparencia
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Esta síntesis fue elaborada automáticamente por el sistema editorial de Diario Imparcial a partir de {sourceCount} fuentes. El proceso cruza coberturas sobre el mismo hecho, marca qué está confirmado, qué queda atribuido y dónde aparecen diferencias entre medios.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Actualizado: {new Date(article.updatedAt).toLocaleString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </article>

          {/* Sidebar */}
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
