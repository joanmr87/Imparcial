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
  title: 'Diario Imparcial - La noticia, sin adjetivos',
  description: 'Noticias argentinas reescritas sin opinion. Hechos verificados de multiples fuentes con total transparencia.',
  generator: 'v0.app',
  keywords: ['noticias', 'argentina', 'imparcial', 'hechos', 'sin opinion', 'transparencia'],
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
