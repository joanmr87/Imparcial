import { Separator } from "@/components/ui/separator"
import type { ImpartialArticle } from "@/lib/types"

interface TransparencyPanelProps {
  article: ImpartialArticle
}

export function TransparencyPanel({ article }: TransparencyPanelProps) {
  return (
    <div className="space-y-8">
      {/* Sources count */}
      <div>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Fuentes analizadas
        </p>
        <p className="mt-2 font-serif text-4xl font-semibold text-foreground">
          {article.sourceCount}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          medios consultados
        </p>
      </div>

      <Separator />

      {/* Facts */}
      <div>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Hechos confirmados
        </p>
        <ul className="mt-4 space-y-3">
          {article.facts.filter(f => f.status === 'confirmed').slice(0, 4).map((fact, index) => (
            <li key={index} className="text-sm text-foreground/80 leading-relaxed">
              <span className="text-muted-foreground mr-2">—</span>
              {fact.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Discrepancies */}
      {article.discrepancies.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Discrepancias
            </p>
            <div className="mt-4 space-y-4">
              {article.discrepancies.map((discrepancy, index) => (
                <div key={index}>
                  <p className="text-sm font-medium text-foreground mb-2">
                    {discrepancy.topic}
                  </p>
                  <ul className="space-y-2">
                    {discrepancy.claims.map((claim, claimIndex) => (
                      <li key={claimIndex} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{claim.source}:</span>{' '}
                        {claim.claim}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Sources list */}
      <div>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Medios consultados
        </p>
        <ul className="mt-4 space-y-3">
          {article.sources.map((source) => (
            <li key={source.id}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <p className="text-sm font-medium text-foreground group-hover:text-muted-foreground transition-colors">
                  {source.name}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {source.title}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
