// Argentine news sources configuration
// Based on the research document's priority ranking

export interface NewsSource {
  id: string
  name: string
  rssUrl: string
  website: string
  priority: 'high' | 'medium' | 'low'
  category?: string
}

export const NEWS_SOURCES: NewsSource[] = [
  // High priority - Top audience
  {
    id: 'infobae',
    name: 'Infobae',
    rssUrl: 'https://www.infobae.com/feeds/rss/',
    website: 'https://www.infobae.com',
    priority: 'high'
  },
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
    rssUrl: 'https://tn.com.ar/arc/outboundfeeds/rss/',
    website: 'https://tn.com.ar',
    priority: 'high'
  },
  // Medium priority
  {
    id: 'ambito',
    name: 'Ambito',
    rssUrl: 'https://www.ambito.com/rss/pages/home.xml',
    website: 'https://www.ambito.com',
    priority: 'medium',
    category: 'economia'
  },
  {
    id: 'cronista',
    name: 'El Cronista',
    rssUrl: 'https://www.cronista.com/arc/outboundfeeds/rss/',
    website: 'https://www.cronista.com',
    priority: 'medium',
    category: 'economia'
  },
  {
    id: 'pagina12',
    name: 'Pagina/12',
    rssUrl: 'https://www.pagina12.com.ar/rss/portada',
    website: 'https://www.pagina12.com.ar',
    priority: 'medium'
  },
  // Low priority - Regional/Niche
  {
    id: 'lavoz',
    name: 'La Voz',
    rssUrl: 'https://www.lavoz.com.ar/rss/',
    website: 'https://www.lavoz.com.ar',
    priority: 'low'
  },
  {
    id: 'iprofesional',
    name: 'iProfesional',
    rssUrl: 'https://www.iprofesional.com/rss',
    website: 'https://www.iprofesional.com',
    priority: 'low',
    category: 'economia'
  }
]

export function getHighPrioritySources(): NewsSource[] {
  return NEWS_SOURCES.filter(s => s.priority === 'high')
}

export function getMediumPrioritySources(): NewsSource[] {
  return NEWS_SOURCES.filter(s => s.priority === 'medium')
}

export function getSourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find(s => s.id === id)
}
