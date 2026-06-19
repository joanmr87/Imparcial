import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Source_Sans_3 } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-serif"
});

const sourceSans = Source_Sans_3({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans"
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://v0-ai-news-verification-ten.vercel.app')

const tagline = 'Leemos todos los diarios para que vos leas la noticia'
const sharedDescription =
  'Diario argentino hecho con IA: cruza la cobertura de varios medios sobre el mismo hecho, resume sin opinión y muestra fuentes, coincidencias y puntos en disputa.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `Diario Imparcial — ${tagline}`,
    template: '%s | Diario Imparcial',
  },
  description: sharedDescription,
  keywords: ['noticias', 'argentina', 'imparcial', 'inteligencia artificial', 'sin sesgos', 'sin bajada de línea', 'hechos', 'sin opinión', 'transparencia', 'anti clickbait', 'whatsapp'],
  openGraph: {
    title: `Diario Imparcial — ${tagline}`,
    description:
      'Un diario hecho con IA que cruza varios medios argentinos para darte una síntesis clara, trazable y sin opinión.',
    url: siteUrl,
    type: 'website',
    locale: 'es_AR',
    siteName: 'Diario Imparcial',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Diario Imparcial — ${tagline}`,
    description:
      'Cruzamos varios medios argentinos para darte una síntesis clara, trazable y sin opinión.',
  },
  icons: {
    icon: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${sourceSans.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
