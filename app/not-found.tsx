import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="max-w-xl text-center">
        <BrandLogo variant="compact" href={null} />
        <p className="mt-10 text-xs tracking-[0.24em] text-muted-foreground uppercase">Error 404</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground md:text-5xl">
          Esta página no está en la edición
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
          El enlace puede haber cambiado o la nota ya no estar disponible. La portada tiene la edición más reciente.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/85"
        >
          Volver a la portada
        </Link>
      </div>
    </main>
  )
}
