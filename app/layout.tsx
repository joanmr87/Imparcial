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

export const metadata: Metadata = {
  title: {
    default: 'Diario Imparcial — La noticia, sin adjetivos',
    template: '%s | Diario Imparcial',
  },
  description:
    'Un diario sin sesgos: cada nota cruza varias coberturas de medios argentinos, separa hechos de opinión y muestra sus fuentes. Síntesis claras, trazables y sin clickbait.',
  keywords: ['noticias', 'argentina', 'imparcial', 'sin sesgos', 'hechos', 'sin opinión', 'transparencia', 'anti clickbait'],
  openGraph: {
    title: 'Diario Imparcial — La noticia, sin adjetivos',
    description:
      'Un diario sin sesgos: cada nota cruza varias coberturas, separa hechos de opinión y muestra sus fuentes.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'Diario Imparcial',
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
