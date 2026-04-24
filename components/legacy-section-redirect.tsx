"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { normalizeSectionSlug } from "@/lib/news-categories"

export function LegacySectionRedirect() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname !== "/") return

    const section = normalizeSectionSlug(searchParams.get("seccion"))
    if (!section) return

    router.replace(`/seccion/${section}`)
  }, [pathname, router, searchParams])

  return null
}
