// Diario Imparcial - Type Definitions

export interface Source {
  id: string
  name: string
  url: string
  logoUrl?: string
  publishedAt: string
  title: string
  snippet: string
}

export interface FactClaim {
  text: string
  confirmedBy: string[] // Source names that confirm this
  status: 'confirmed' | 'reported' | 'disputed' | 'developing'
}

export interface Discrepancy {
  topic: string
  claims: {
    source: string
    claim: string
  }[]
}

export interface ImpartialArticle {
  id: string
  slug: string
  title: string
  summary: string
  content: string
  facts: FactClaim[]
  discrepancies: Discrepancy[]
  sources: Source[]
  sourceCount: number
  articleCount: number
  category: string
  createdAt: string
  updatedAt: string
  status: 'confirmed' | 'developing' | 'disputed'
}

export interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

export interface NewsCluster {
  topic: string
  articles: RSSItem[]
  sourcesCount: number
}
