import Link from "next/link"

/**
 * Isotipo Diario Imparcial.
 *
 * Una "I" editorial construida con columnas que se unen arriba y abajo:
 * muchas fuentes (columnas) atadas en una sola lectura (la letra I).
 * El filete dorado central marca la síntesis. Por defecto hereda el color
 * del texto (currentColor), de modo que funciona en tinta sobre papel y en
 * papel sobre fondo oscuro sin variantes extra.
 */
export function BrandIsotype({
  tile = false,
  className = "",
}: {
  tile?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      {tile && <rect width="64" height="64" rx="14" fill="var(--brand-ink)" />}
      <g fill={tile ? "var(--brand-paper)" : "currentColor"}>
        {/* serif superior e inferior: unifican las columnas en una sola I */}
        <rect x="16" y="16" width="32" height="5" rx="1" />
        <rect x="16" y="43" width="32" height="5" rx="1" />
        {/* columnas / fuentes */}
        <rect x="18" y="22" width="6" height="21" />
        <rect x="40" y="22" width="6" height="21" />
      </g>
      {/* columna central dorada: la síntesis */}
      <rect x="29" y="22" width="6" height="21" fill="var(--brand-gold)" />
    </svg>
  )
}

type LogoVariant = "full" | "compact" | "mark"

interface BrandLogoProps {
  /** full: masthead completo · compact: línea breve · mark: solo isotipo */
  variant?: LogoVariant
  href?: string | null
  className?: string
}

/**
 * Lockup de marca. "Imparcial" siempre es el punto de mayor reconocimiento;
 * "Diario" funciona como antetítulo sobrio.
 */
export function BrandLogo({ variant = "full", href = "/", className = "" }: BrandLogoProps) {
  const content =
    variant === "mark" ? (
      <BrandIsotype className="h-8 w-8 text-foreground" />
    ) : variant === "compact" ? (
      <span className="inline-flex items-center gap-2">
        <BrandIsotype className="h-5 w-5 text-foreground" />
        <span className="font-serif text-base font-bold text-foreground">
          <span className="text-muted-foreground">Diario </span>Imparcial
        </span>
      </span>
    ) : (
      <span className="inline-flex flex-col items-center gap-3">
        <BrandIsotype className="h-11 w-11 text-foreground md:h-12 md:w-12" />
        <span className="flex flex-col items-center leading-none">
          <span className="text-[0.7rem] font-medium tracking-[0.45em] text-muted-foreground uppercase">
            Diario
          </span>
          <span className="mt-1 font-serif text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Imparcial
          </span>
        </span>
      </span>
    )

  if (href === null) {
    return <span className={className}>{content}</span>
  }

  return (
    <Link href={href} prefetch={false} className={`inline-block ${className}`.trim()}>
      {content}
    </Link>
  )
}
