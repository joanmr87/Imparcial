import Image from "next/image"
import Link from "next/link"
import type { ImpartialArticle } from "@/lib/types"

interface ArticleCardProps {
  article: ImpartialArticle
  variant?: "featured" | "large" | "medium" | "small" | "minimal"
}

function sourceTags(article: ImpartialArticle) {
  return [...new Set(article.sources.map(source => source.name))].slice(0, 5)
}

function SourceTagList({ article }: { article: ImpartialArticle }) {
  const tags = sourceTags(article)

  if (tags.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.map(tag => (
        <span
          key={tag}
          className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] tracking-wide text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

function ArticleCardImage({
  article,
  tall = false,
  priority = false,
}: {
  article: ImpartialArticle
  tall?: boolean
  priority?: boolean
}) {
  if (!article.heroImageUrl) return null

  return (
    <div className={`overflow-hidden bg-muted ${tall ? "aspect-[16/10]" : "aspect-[16/9]"}`}>
      <Image
        src={article.heroImageUrl}
        alt={article.title}
        width={1600}
        height={tall ? 1000 : 900}
        sizes={tall ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 768px) 100vw, 50vw"}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        priority={priority}
      />
    </div>
  )
}

export function ArticleCard({ article, variant = "medium" }: ArticleCardProps) {
  const authorLine = `${article.sourceCount} fuentes`

  if (variant === "featured") {
    return (
      <Link href={`/nota/${article.slug}`} prefetch={false} className="group block">
        <article className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/90 shadow-[0_18px_50px_rgba(28,28,28,0.06)]">
          <ArticleCardImage article={article} tall priority />
          <div className="px-5 py-5 md:px-6">
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
            <SourceTagList article={article} />
          </div>
        </article>
      </Link>
    )
  }

  if (variant === "large") {
    return (
      <Link href={`/nota/${article.slug}`} prefetch={false} className="group block">
        <article className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/80 shadow-[0_14px_36px_rgba(28,28,28,0.05)]">
          <ArticleCardImage article={article} />
          <div className="px-4 py-4 md:px-5">
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
            <SourceTagList article={article} />
          </div>
        </article>
      </Link>
    )
  }

  if (variant === "small") {
    return (
      <Link href={`/nota/${article.slug}`} prefetch={false} className="group block">
        <article className="rounded-[1.25rem] border border-border/70 bg-card/70 px-4 py-4 transition-shadow hover:shadow-[0_10px_24px_rgba(28,28,28,0.05)]">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {article.category}
          </p>
          <h3 className="mt-1 font-serif text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-muted-foreground text-balance">
            {article.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {article.summary}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {authorLine}
          </p>
          <SourceTagList article={article} />
        </article>
      </Link>
    )
  }

  if (variant === "minimal") {
    return (
      <Link href={`/nota/${article.slug}`} prefetch={false} className="group block">
        <article className="flex items-start gap-3 rounded-[1.15rem] border border-border/70 bg-card/65 px-3.5 py-3.5">
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
            <SourceTagList article={article} />
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={`/nota/${article.slug}`} prefetch={false} className="group block">
      <article className="rounded-[1.35rem] border border-border/70 bg-card/75 px-4 py-4 transition-shadow hover:shadow-[0_12px_28px_rgba(28,28,28,0.05)]">
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
        <SourceTagList article={article} />
      </article>
    </Link>
  )
}
