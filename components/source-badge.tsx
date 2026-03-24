import { ExternalLink } from "lucide-react"
import type { Source } from "@/lib/types"

interface SourceBadgeProps {
  source: Source
  showLink?: boolean
}

export function SourceBadge({ source, showLink = true }: SourceBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary text-sm font-bold text-secondary-foreground">
        {source.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{source.name}</span>
          {showLink && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {new Date(source.publishedAt).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  )
}
