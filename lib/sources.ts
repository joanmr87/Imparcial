// Argentine news sources configuration
// Feeds verified on 2026-03-24.

export interface NewsSource {
  id: string
  name: string
  rssUrl?: string
  rssUrls?: string[]
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
    rssUrls: [
      'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/?outputType=xml',
    ],
    website: 'https://www.lanacion.com.ar',
    priority: 'high'
  },
  {
    id: 'clarin',
    name: 'Clarin',
    rssUrl: 'https://www.clarin.com/rss/lo-ultimo/',
    rssUrls: [
      'https://www.clarin.com/rss/deportes/',
    ],
    website: 'https://www.clarin.com',
    priority: 'high'
  },
  {
    id: 'tn',
    name: 'TN',
    rssUrl: 'https://tn.com.ar/arc/outboundfeeds/rss/?outputType=xml',
    rssUrls: [
      'https://tn.com.ar/arc/outboundfeeds/rss/category/deportes/?outputType=xml',
    ],
    website: 'https://tn.com.ar',
    priority: 'high'
  },
  {
    id: 'ambito',
    name: 'Ambito',
    rssUrl: 'https://www.ambito.com/rss/pages/home.xml',
    rssUrls: [
      'https://www.ambito.com/rss/pages/deportes.xml',
    ],
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
    rssUrl: 'https://www.infobae.com/arc/outboundfeeds/rss/',
    rssUrls: [
      'https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/?outputType=xml',
    ],
    website: 'https://www.infobae.com',
    priority: 'medium',
    enabled: true,
    notes: 'Official RSS endpoint verified from site footer on 2026-03-24'
  },
  {
    id: 'pagina12',
    name: 'Pagina/12',
    rssUrls: [
      'https://www.pagina12.com.ar/arc/outboundfeeds/rss/portada/',
      'https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/el-pais/notas',
      'https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/economia/notas',
      'https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/sociedad/notas',
      'https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/deportes/notas',
    ],
    website: 'https://www.pagina12.com.ar',
    priority: 'medium',
    enabled: true,
    notes: 'Official RSS catalog published at pagina12.com.ar/rss/'
  },
  {
    id: 'iprofesional',
    name: 'iProfesional',
    rssUrls: [
      'https://www.iprofesional.com/rss/home',
      'https://www.iprofesional.com/rss/economia',
      'https://www.iprofesional.com/rss/politica',
      'https://www.iprofesional.com/rss/finanzas',
      'https://www.iprofesional.com/rss/negocios',
    ],
    website: 'https://www.iprofesional.com',
    priority: 'medium',
    enabled: true,
    category: 'economia',
    notes: 'Official RSS endpoints listed at iprofesional.com/rss.html'
  },
  {
    id: 'minutouno',
    name: 'Minuto Uno',
    rssUrls: [
      'https://www.minutouno.com/rss/politica',
      'https://www.minutouno.com/rss/economia',
      'https://www.minutouno.com/rss/sociedad',
      'https://www.minutouno.com/rss/deportes',
      'https://www.minutouno.com/rss/mundo',
    ],
    website: 'https://www.minutouno.com',
    priority: 'medium',
    enabled: true,
    notes: 'Official RSS section endpoints linked from minutouno.com/rss'
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
  return NEWS_SOURCES.filter(source => {
    if (source.enabled === false) return false
    return Boolean(source.rssUrl) || Boolean(source.rssUrls?.length)
  })
}

export function getSourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find(s => s.id === id)
}
