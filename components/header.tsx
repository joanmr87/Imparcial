"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { EditorialPromise } from "@/components/editorial-promise"
import { formatArgentinaLongDate } from "@/lib/date-format"

const navItems = [
  { label: "Política", href: "/seccion/politica" },
  { label: "Economía", href: "/seccion/economia" },
  { label: "Sociedad", href: "/seccion/sociedad" },
  { label: "Deportes", href: "/seccion/deportes" },
  { label: "Metodología", href: "/metodologia" },
]

interface HeaderProps {
  dateString: string
}

export function Header({ dateString }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentDateString, setCurrentDateString] = useState(dateString)

  useEffect(() => {
    const updateDate = () => {
      setCurrentDateString(formatArgentinaLongDate())
    }

    updateDate()
    const intervalId = window.setInterval(updateDate, 1000 * 60 * 30)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <>
      <header className="border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4">
          {/* Date bar */}
          <div className="border-b border-border py-2">
            <p className="text-center text-xs tracking-widest text-muted-foreground uppercase">
              {currentDateString}
            </p>
          </div>

          {/* Logo */}
          <div className="py-8 text-center">
            <Link href="/" prefetch={false} className="inline-block">
              <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Diario Imparcial
              </h1>
            </Link>
            <p className="mt-2 text-sm tracking-[0.28em] text-muted-foreground uppercase">
              La noticia, sin adjetivos
            </p>
            <EditorialPromise compact />
          </div>
        </div>
      </header>

      {/* Nav sticks for the whole page, so sections stay reachable while scrolling */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 shadow-[0_8px_24px_rgba(28,28,28,0.04)] backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4">
          {/* Desktop nav */}
          <nav className="hidden md:block">
            <ul className="flex items-center justify-center gap-8 py-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="text-sm tracking-wide text-foreground underline-offset-8 transition-colors hover:text-muted-foreground hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center justify-between py-3 md:hidden">
            <Link href="/" prefetch={false} className="font-serif text-base font-bold text-foreground">
              Imparcial
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span>Secciones</span>
            </button>
          </div>

          {/* Mobile nav */}
          {mobileMenuOpen && (
            <nav className="border-t border-border py-4 md:hidden">
              <ul className="flex flex-col items-center gap-4">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className="text-sm tracking-wide text-foreground transition-colors hover:text-muted-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </>
  )
}
