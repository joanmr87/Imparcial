import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST() {
  const supabase = await createClient()

  try {
    // Insert sample articles
    const articlesData = [
      {
        title: 'Suba de tasas en Argentina: qué dicen los economistas',
        slug: 'suba-tasas-argentina-economistas',
        summary: 'El Banco Central anunció una nueva suba de tasas de interés. Analizamos las perspectivas de economistas sobre el impacto en la inflación.',
        content: 'En una decisión esperada por los mercados, el Banco Central de la República Argentina anunció hoy una suba de 100 puntos básicos en la tasa de política monetaria, llevándola al 40%. Esta es la tercera suba consecutiva en lo que va del año.',
        category: 'Economía',
        featured: true,
      },
      {
        title: 'Reforma tributaria: principales puntos debatidos',
        slug: 'reforma-tributaria-debate-2024',
        summary: 'La comisión de Presupuesto y Hacienda sesionó hoy para analizar la nueva reforma tributaria propuesta por el Ejecutivo.',
        content: 'Durante la sesión de hoy, los diputados debatieron los principales artículos del proyecto de reforma tributaria. Según fuentes parlamentarias, hay consenso en algunos puntos pero divergencias en otros.',
        category: 'Política',
        featured: true,
      },
      {
        title: 'Inflación acumulada llega a 178% interanual',
        slug: 'inflacion-178-interanual',
        summary: 'El INDEC publicó los datos del mes pasado. La inflación mensual fue de 4.2%, acumulando 178% en los últimos 12 meses.',
        content: 'Según el Instituto Nacional de Estadística y Censos, la inflación del mes pasado alcanzó el 4.2%, ubicándose dentro de las expectativas del mercado.',
        category: 'Economía',
        featured: false,
      },
    ]

    // Insert articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .insert(articlesData)
      .select()

    if (articlesError) throw articlesError

    if (!articles || articles.length === 0) {
      throw new Error('No articles were inserted')
    }

    // Insert sources for each article
    const sourcesData: any[] = []

    // Article 1 sources
    sourcesData.push(
      {
        article_id: articles[0].id,
        diario_name: 'Infobea',
        diario_url: 'https://infobae.com',
        source_title: 'Suba de tasas: el Banco Central llevaría la tasa al 40%',
        source_url: 'https://infobae.com/economia/tasas-2024',
        snippet: 'Se espera un aumento de 100 puntos básicos en la próxima reunión de directorio',
      },
      {
        article_id: articles[0].id,
        diario_name: 'Clarín',
        diario_url: 'https://clarin.com',
        source_title: 'El BCRA sube tasas en medio de presiones inflacionarias',
        source_url: 'https://clarin.com/economia/bcra-tasas',
        snippet: 'Los economistas analizan el impacto de la medida en el consumo',
      },
      {
        article_id: articles[0].id,
        diario_name: 'La Nación',
        diario_url: 'https://lanacion.com.ar',
        source_title: 'Tasas más altas: cómo impacta en tus ahorros',
        source_url: 'https://lanacion.com.ar/economia/tasas',
        snippet: 'Analizamos el impacto de la suba en plazo fijos y préstamos',
      }
    )

    // Article 2 sources
    sourcesData.push(
      {
        article_id: articles[1].id,
        diario_name: 'Página/12',
        diario_url: 'https://pagina12.com.ar',
        source_title: 'Debate sobre la reforma tributaria en Diputados',
        source_url: 'https://pagina12.com.ar/politica/reforma-tributaria',
        snippet: 'La comisión sesionó durante 8 horas analizando los artículos',
      },
      {
        article_id: articles[1].id,
        diario_name: 'Ámbito',
        diario_url: 'https://ambito.com',
        source_title: 'Reforma tributaria: los puntos de conflicto',
        source_url: 'https://ambito.com/politica/reforma',
        snippet: 'Hay divergencias entre bloques respecto a la carga tributaria',
      }
    )

    // Article 3 sources
    sourcesData.push(
      {
        article_id: articles[2].id,
        diario_name: 'TN',
        diario_url: 'https://tn.com.ar',
        source_title: 'Inflación en 178%: qué compraste hace un año cuesta el triple',
        source_url: 'https://tn.com.ar/economia/inflacion',
        snippet: 'El INDEC publicó los índices de precios del mes pasado',
      },
      {
        article_id: articles[2].id,
        diario_name: 'El Cronista',
        diario_url: 'https://cronista.com',
        source_title: 'Inflación acumulada: la medición más alta de la década',
        source_url: 'https://cronista.com/economia/inflacion-2024',
        snippet: 'Analistas estudian el impacto de estos números en la política monetaria',
      }
    )

    const { error: sourcesError } = await supabase
      .from('sources')
      .insert(sourcesData)

    if (sourcesError) throw sourcesError

    // Insert facts for each article
    const factsData: any[] = [
      {
        article_id: articles[0].id,
        fact_text: 'El Banco Central anunció suba de 100 puntos básicos en la tasa de política monetaria',
        status: 'confirmed',
      },
      {
        article_id: articles[0].id,
        fact_text: 'La nueva tasa de política monetaria es del 40%',
        status: 'confirmed',
      },
      {
        article_id: articles[1].id,
        fact_text: 'La comisión de Presupuesto y Hacienda sesionó sobre reforma tributaria',
        status: 'confirmed',
      },
      {
        article_id: articles[2].id,
        fact_text: 'La inflación acumulada interanual alcanzó el 178%',
        status: 'confirmed',
      },
      {
        article_id: articles[2].id,
        fact_text: 'La inflación del mes fue de 4.2%',
        status: 'confirmed',
      },
    ]

    const { error: factsError } = await supabase
      .from('facts')
      .insert(factsData)

    if (factsError) throw factsError

    return Response.json(
      {
        success: true,
        message: 'Sample data inserted successfully',
        articles: articles.length,
        sources: sourcesData.length,
        facts: factsData.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error inserting sample data:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
