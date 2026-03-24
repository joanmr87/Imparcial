import type { RSSItem, Source } from "./types"

type SourceLike = Pick<RSSItem, "sourceId" | "link"> | Pick<Source, "name" | "url">

const INFOBAE_FOREIGN_SECTION_PATTERN = /\/(colombia|mexico|peru|america|espana|estados-unidos|usa)\//

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function isForeignInfobaeUrl(url: string): boolean {
  return INFOBAE_FOREIGN_SECTION_PATTERN.test(normalizeText(url))
}

export function isBlockedExternalSource(source: SourceLike): boolean {
  const sourceId = "sourceId" in source ? source.sourceId : normalizeText(source.name)
  const url = "link" in source ? source.link : source.url

  if (sourceId === "infobae" && isForeignInfobaeUrl(url)) {
    return true
  }

  return false
}
