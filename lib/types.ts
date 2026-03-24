// Diario Imparcial - Type Definitions

export type FactStatus = "confirmed" | "reported" | "disputed" | "developing"
export type ArticleStatus = "confirmed" | "developing" | "disputed"

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
  confirmedBy: string[]
  status: FactStatus
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
  status: ArticleStatus
}

export interface SourceArticleInput {
  source: string
  sourceId?: string
  title: string
  description: string
  link: string
  pubDate: string
  imageUrl?: string
}

export interface RSSItem extends SourceArticleInput {
  sourceId: string
}

export interface NewsCluster {
  id: string
  topic: string
  canonicalTitle: string
  articles: RSSItem[]
  sourcesCount: number
  keywords: string[]
  firstPublishedAt: string
  lastPublishedAt: string
}

export interface PipelineWarning {
  code: string
  message: string
}

export interface SchemaStatus {
  ready: boolean
  checkedTables: string[]
  missingTables: string[]
}
