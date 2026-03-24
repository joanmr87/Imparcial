// Argentine news sources configuration
// Feeds verified on 2026-03-24.

export interface NewsSource {
  id: string
  name: string
  rssUrl: string
  website: string
  priority: 'high' | 'medium' | 'low'
  category?: string
  enabled?: boolean
  notes?: string
}

export const NEWS_SOURCES: NewsSource[] = [
  // High priority - stable national reach
  {
    id: 'lanacion',
    name: 'La Nacion',
    rssUrl: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml',
    website: 'https://www.lanacion.com.ar',
    priority: 'high'
  },
  {
    id: 'clarin',
    name: 'Clarin',
    rssUrl: 'https://www.clarin.com/rss/lo-ultimo/',
    website: 'https://www.clarin.com',
    priority: 'high'
  },
  {
    id: 'tn',
    name: 'TN',
    rssUrl: 'https://tn.com.ar/arc/outboundfeeds/rss/?outputType=xml',
    website: 'https://tn.com.ar',
    priority: 'high'
  },
  {
    id: 'ambito',
    name: 'Ambito',
    rssUrl: 'https://www.ambito.com/rss/pages/home.xml',
    website: 'https://www.ambito.com',
    priority: 'high',
    category: 'economia'
  },
  // Medium priority - broader editorial mix
  {
    id: 'cronista',
    name: 'El Cronista',
    rssUrl: 'https://www.cronista.com/arc/outboundfeeds/rss/',
    website: 'https://www.cronista.com',
    priority: 'medium',
    category: 'economia'
  },
  {
    id: 'perfil',
    name: 'Perfil',
    rssUrl: 'https://www.perfil.com/feed',
    website: 'https://www.perfil.com',
    priority: 'medium'
  },
  // Disabled until a stable feed path is confirmed again
  {
    id: 'infobae',
    name: 'Infobae',
    rssUrl: 'https://www.infobae.com/feeds/rss/',
    website: 'https://www.infobae.com',
    priority: 'medium',
    enabled: false,
    notes: 'Official RSS endpoint returned 404 during verification'
  },
  {
    id: 'pagina12',
    name: 'Pagina/12',
    rssUrl: 'https://www.pagina12.com.ar/rss/portada/',
    website: 'https://www.pagina12.com.ar',
    priority: 'medium',
    enabled: false,
    notes: 'Previous RSS endpoint returned 404 during verification'
  },
  // Low priority - add carefully because some feeds challenge bots
  {
    id: 'lavoz',
    name: 'La Voz',
    rssUrl: 'https://www.lavoz.com.ar/rss/',
    website: 'https://www.lavoz.com.ar',
    priority: 'low',
    enabled: false,
    notes: 'Cloudflare challenge blocks automated retrieval'
  },
  {
    id: 'iprofesional',
    name: 'iProfesional',
    rssUrl: 'https://www.iprofesional.com/rss',
    website: 'https://www.iprofesional.com',
    priority: 'low',
    enabled: false,
    category: 'economia',
    notes: 'RSS endpoint now responds with HTML instead of XML'
  },
  {
    id: 'a24',
    name: 'A24',
    rssUrl: 'https://www.a24.com/rss',
    website: 'https://www.a24.com',
    priority: 'low',
    enabled: false,
    notes: 'Current endpoint returned 404 during verification'
  },
  {
    id: 'regional-placeholder',
    name: 'Fuente regional',
    rssUrl: '',
    website: '',
    priority: 'low',
    enabled: false,
    notes: 'Reserved for a future vetted regional source'
  }
]

export function getHighPrioritySources(): NewsSource[] {
  return NEWS_SOURCES.filter(s => s.priority === 'high' && s.enabled !== false)
}

export function getMediumPrioritySources(): NewsSource[] {
  return NEWS_SOURCES.filter(s => s.priority === 'medium' && s.enabled !== false)
}

export function getEnabledSources(): NewsSource[] {
  return NEWS_SOURCES.filter(source => source.enabled !== false && source.rssUrl)
}

export function getSourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find(s => s.id === id)
}
