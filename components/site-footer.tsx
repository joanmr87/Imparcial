import { MessageCircle } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

interface SiteFooterProps {
  className?: string
}

export function SiteFooter({ className = "" }: SiteFooterProps) {
  const whatsappUrl =
    "https://wa.me/5492984388886?text=Hola%2C%20quiero%20recibir%20el%20resumen%20imparcial%20del%20dia%20por%20WhatsApp."

  return (
    <footer className={`border-t border-border ${className}`.trim()}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 text-center md:grid-cols-[1fr_1.1fr_1fr] md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <BrandLogo variant="compact" />
            <p className="mt-2 text-xs text-muted-foreground">
              Menos ruido. Más contexto. Fuentes a la vista.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-green-border bg-brand-green-soft px-3 py-1.5 text-xs font-semibold text-brand-green transition-colors hover:bg-brand-green-softer"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Recibir resumen diario
            </a>
          </div>

          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Firma editorial
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              Un proyecto de IA y producto editorial creado por{" "}
              <span className="font-semibold text-foreground">Joan M. Romero</span> para cruzar
              coberturas, ordenar contexto y mostrar fuentes.
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
