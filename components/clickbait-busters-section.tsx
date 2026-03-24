"use client"

import { startTransition, useEffect, useState } from "react"
import { ClickbaitBusters } from "@/components/clickbait-busters"
import type { ClickbaitBusterItem } from "@/lib/clickbait"

export function ClickbaitBustersSection() {
  const [items, setItems] = useState<ClickbaitBusterItem[]>([])

  useEffect(() => {
    let cancelled = false

    const loadItems = async () => {
      try {
        const endpoint: string = "/api/clickbait"
        const response = await fetch(endpoint, { cache: "no-store" })
        if (!response.ok) return

        const payload = await response.json() as { items?: ClickbaitBusterItem[] }
        const nextItems = payload.items
        if (cancelled || !nextItems) return

        startTransition(() => {
          setItems(nextItems)
        })
      } catch {
        // Keep the section hidden on fetch errors.
      }
    }

    void loadItems()

    return () => {
      cancelled = true
    }
  }, [])

  return <ClickbaitBusters items={items} />
}
