import type { LiveBrief } from "@/lib/homepage"

interface LiveBriefCardProps {
  brief: LiveBrief
  variant?: "large" | "small"
}

export function LiveBriefCard({ brief, variant = "small" }: LiveBriefCardProps) {
  if (variant === "large") {
    return (
      <a href={brief.url} target="_blank" rel="noopener noreferrer" className="group block">
        <article>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {brief.category}
          </p>
          <h3 className="mt-2 font-serif text-2xl font-semibold leading-tight text-foreground transition-colors group-hover:text-muted-foreground md:text-3xl text-balance">
            {brief.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            {brief.summary}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {brief.source}
          </p>
        </article>
      </a>
    )
  }

  return (
    <a href={brief.url} target="_blank" rel="noopener noreferrer" className="group block">
      <article>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          {brief.category}
        </p>
        <h3 className="mt-1 font-serif text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-muted-foreground text-balance">
          {brief.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {brief.summary}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {brief.source}
        </p>
      </article>
    </a>
  )
}
