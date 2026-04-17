import { ClickbaitBusters } from "@/components/clickbait-busters"
import type { ClickbaitBusterItem } from "@/lib/clickbait"

interface ClickbaitBustersSectionProps {
  items: ClickbaitBusterItem[]
  generatedAt?: string
}

export function ClickbaitBustersSection({ items, generatedAt }: ClickbaitBustersSectionProps) {
  return <ClickbaitBusters items={items} generatedAt={generatedAt} />
}
