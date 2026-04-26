import Link from "next/link"

interface EditorialPromiseProps {
  showMethodologyLink?: boolean
  centered?: boolean
  compact?: boolean
}

export function EditorialPromise({
  showMethodologyLink = false,
  centered = true,
  compact = false,
}: EditorialPromiseProps) {
  return (
    <div
      className={[
        "mt-3",
        centered ? "mx-auto text-center" : "text-left",
        compact ? "max-w-3xl" : "max-w-4xl",
      ].join(" ")}
    >
      <div
        className={[
          "inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border px-4 py-2",
          "border-[#bfd3c2] bg-[#e7f1eb] text-[#2f4e3f]",
          compact ? "text-[11px] leading-relaxed md:text-xs" : "text-xs leading-relaxed md:text-sm",
        ].join(" ")}
      >
        <span className="font-semibold uppercase tracking-[0.18em]">Hecho con IA</span>
        <span className="hidden h-1 w-1 rounded-full bg-[#6f8b78] md:block" />
        <span>cruza varios medios para reducir sesgos y reescribir cada nota sin opinion</span>
        {showMethodologyLink && (
          <>
            <span className="hidden h-1 w-1 rounded-full bg-[#6f8b78] md:block" />
            <Link
              href="/metodologia"
              prefetch={false}
              className="font-medium underline decoration-[#6f8b78] underline-offset-4 transition-colors hover:text-[#1f352b]"
            >
              Ver metodologia
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
