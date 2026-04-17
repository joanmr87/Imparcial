import Link from "next/link"
import { ArticleCard } from "@/components/article-card"
import type { HomepageSection } from "@/lib/homepage"

interface HomepageSectionProps {
  section: HomepageSection
}

export function HomepageSectionBlock({ section }: HomepageSectionProps) {
  if (!section.lead && section.articles.length === 0) {
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

      <div className="mt-8 space-y-8 rounded-[1.75rem] bg-card/40 p-4 md:p-6">
        {section.lead && <ArticleCard article={section.lead} variant="large" />}

        {section.articles.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {section.articles.map(article => (
              <ArticleCard key={article.id} article={article} variant="small" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
