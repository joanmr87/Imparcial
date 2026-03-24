import Link from "next/link"
import { ArticleCard } from "@/components/article-card"
import type { HomepageSection } from "@/lib/homepage"

interface HomepageSectionProps {
  section: HomepageSection
}

export function HomepageSectionBlock({ section }: HomepageSectionProps) {
  if (!section.lead && section.articles.length === 0 && section.briefs.length === 0) {
    return null
  }

  return (
    <section id={section.slug} className="mt-16 border-t border-border pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Seccion
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground">
            {section.label}
          </h2>
        </div>
        <Link
          href={`/?seccion=${section.slug}`}
          className="text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver solo {section.label.toLowerCase()}
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          {section.lead && <ArticleCard article={section.lead} variant="large" />}

          {section.articles.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {section.articles.map(article => (
                <ArticleCard key={article.id} article={article} variant="small" />
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-[1.5rem] border border-border bg-card/30 p-5">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Radar en vivo
          </p>
          <div className="mt-5 space-y-5">
            {section.briefs.map(brief => (
              <a
                key={brief.id}
                href={brief.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-border bg-background px-4 py-4 transition-colors hover:bg-secondary/40"
              >
                <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
                  {brief.source}
                </p>
                <h3 className="mt-2 font-serif text-lg font-semibold leading-snug text-foreground text-balance">
                  {brief.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {brief.summary}
                </p>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}
