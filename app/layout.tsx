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
    default: 'Diario Imparcial — Menos ruido. Más contexto.',
    template: '%s | Diario Imparcial',
  },
  description:
    'Diario argentino hecho con IA: cruza coberturas de varios medios, resume noticias sin opinión y muestra fuentes, coincidencias y puntos en disputa.',
  keywords: ['noticias', 'argentina', 'imparcial', 'inteligencia artificial', 'sin sesgos', 'hechos', 'sin opinión', 'transparencia', 'anti clickbait', 'whatsapp'],
  openGraph: {
    title: 'Diario Imparcial — Menos ruido. Más contexto.',
    description:
      'Un diario hecho con IA que cruza varios medios argentinos para darte una síntesis clara, trazable y sin opinión.',
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
