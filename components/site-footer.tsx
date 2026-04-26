import Link from "next/link"

interface SiteFooterProps {
  className?: string
}

export function SiteFooter({ className = "" }: SiteFooterProps) {
  return (
    <footer className={`border-t border-border ${className}`.trim()}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 text-center md:grid-cols-[1fr_1.1fr_1fr] md:text-left">
          <div>
            <Link href="/" prefetch={false} className="font-serif text-lg font-semibold text-foreground transition-colors hover:text-muted-foreground">
              Diario Imparcial
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              La noticia, sin adjetivos.
            </p>
          </div>

          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Firma
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              Un proyecto editorial y de producto creado por{" "}
              <span className="font-semibold text-foreground">Joan M. Romero</span>.
            </p>
          </div>

          <div className="md:text-right">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Contacto
            </p>
            <div className="mt-2 flex flex-col items-center gap-1.5 text-sm md:items-end">
              <a
                href="mailto:joanmr87@gmail.com"
                className="text-foreground underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"
              >
                joanmr87@gmail.com
              </a>
              <a
                href="tel:+5492984388886"
                className="text-foreground underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"
              >
                +54 9 2984 38-8886
              </a>
              <a
                href="https://www.linkedin.com/in/joanmromero/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"
              >
                linkedin.com/in/joanmromero
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
