import Link from "next/link"
import type { ImpartialArticle } from "@/lib/types"

interface ArticleCardProps {
  article: ImpartialArticle
  variant?: "featured" | "large" | "medium" | "small" | "minimal"
}

export function ArticleCard({ article, variant = "medium" }: ArticleCardProps) {
  const authorLine = `${article.sourceCount} fuentes`

  if (variant === "featured") {
    return (
      <Link href={`/nota/${article.slug}`} className="group block">
        <article>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {article.category}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground transition-colors group-hover:text-muted-foreground md:text-4xl lg:text-5xl text-balance">
            {article.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            {article.summary}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {authorLine}
          </p>
        </article>
      </Link>
    )
  }

  if (variant === "large") {
    return (
      <Link href={`/nota/${article.slug}`} className="group block">
        <article>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {article.category}
          </p>
          <h3 className="mt-2 font-serif text-2xl font-semibold leading-tight text-foreground transition-colors group-hover:text-muted-foreground md:text-3xl text-balance">
            {article.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            {article.summary}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {authorLine}
          </p>
        </article>
      </Link>
    )
  }

  if (variant === "small") {
    return (
      <Link href={`/nota/${article.slug}`} className="group block">
        <article>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {article.category}
          </p>
          <h3 className="mt-1 font-serif text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-muted-foreground text-balance">
            {article.title}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {authorLine}
          </p>
        </article>
      </Link>
    )
  }

  if (variant === "minimal") {
    return (
      <Link href={`/nota/${article.slug}`} className="group block">
        <article className="flex items-start gap-3">
          <span className="font-serif text-2xl font-light text-muted-foreground/50">
            {article.category.charAt(0)}
          </span>
          <div>
            <h3 className="font-serif text-base font-medium leading-snug text-foreground transition-colors group-hover:text-muted-foreground text-balance">
              {article.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {authorLine}
            </p>
          </div>
        </article>
      </Link>
    )
  }

  // Default: medium
  return (
    <Link href={`/nota/${article.slug}`} className="group block">
      <article>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          {article.category}
        </p>
        <h3 className="mt-2 font-serif text-xl font-semibold leading-snug text-foreground transition-colors group-hover:text-muted-foreground md:text-2xl text-balance">
          {article.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {article.summary}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {authorLine}
        </p>
      </article>
    </Link>
  )
}
