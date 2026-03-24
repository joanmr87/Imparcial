import { generateText, Output } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'

// Schema for the impartial article output
const impartialArticleSchema = z.object({
  title: z.string().describe('Titulo neutral y descriptivo de la noticia'),
  summary: z.string().describe('Resumen de 2-3 oraciones sin adjetivos ni opinion'),
  content: z.string().describe('Contenido completo de la nota con hechos, atribuciones y discrepancias claramente separados'),
  facts: z.array(z.object({
    text: z.string().describe('Descripcion del hecho'),
    confirmedBy: z.array(z.string()).describe('Nombres de fuentes que confirman este hecho'),
    status: z.enum(['confirmed', 'reported', 'disputed', 'developing']).describe('Estado de verificacion del hecho')
  })).describe('Lista de hechos extraidos de las fuentes'),
  discrepancies: z.array(z.object({
    topic: z.string().describe('Tema o aspecto en el que las fuentes difieren'),
    claims: z.array(z.object({
      source: z.string().describe('Nombre de la fuente'),
      claim: z.string().describe('Afirmacion de esa fuente')
    }))
  })).describe('Discrepancias encontradas entre las fuentes'),
  category: z.string().describe('Categoria de la noticia: Politica, Economia, Sociedad, Deportes, etc.')
})

const SYSTEM_PROMPT = `Eres un editor de Diario Imparcial, un medio digital argentino que reescribe noticias sin opinion ni adjetivos calificativos.

Tu tarea es analizar multiples articulos sobre el mismo tema y producir UNA nota imparcial siguiendo estas reglas estrictas:

## REGLAS DE REDACCION

1. **Sin adjetivos calificativos**: No uses palabras como "importante", "grave", "historico", "polemico", etc.
2. **Sin opinion**: No interpretes ni valores los hechos. Solo reporta lo que paso.
3. **Atribucion explicita**: Toda afirmacion debe estar atribuida ("Segun X...", "Para Y...")
4. **Separar hechos de interpretaciones**: Los hechos van en la seccion principal, las interpretaciones se atribuyen.
5. **Mostrar discrepancias**: Si las fuentes difieren, mostrar TODAS las versiones sin elegir una.

## ESTRUCTURA DE LA NOTA

1. **Hechos confirmados**: Lo que todas o la mayoria de las fuentes coinciden.
2. **Informacion atribuida**: Lo que cada fuente reporta individualmente.
3. **Puntos de discrepancia**: Donde las fuentes difieren, mostrando cada version.

## IMPORTANTE
- No inventes informacion que no este en las fuentes.
- Si hay numeros contradictorios, reporta TODOS los numeros y sus fuentes.
- El titulo debe ser descriptivo y neutral, sin clickbait.
- El resumen debe poder leerse independientemente y dar la idea central.`

interface SourceArticle {
  source: string
  title: string
  description: string
  link: string
  pubDate: string
}

export async function POST(req: Request) {
  try {
    const { articles } = await req.json() as { articles: SourceArticle[] }

    if (!articles || articles.length < 2) {
      return NextResponse.json(
        { error: 'Se requieren al menos 2 articulos para generar una nota imparcial' },
        { status: 400 }
      )
    }

    // Format articles for the prompt
    const formattedArticles = articles.map((article, index) => 
      `### Fuente ${index + 1}: ${article.source}
Titulo: ${article.title}
Contenido: ${article.description}
Publicado: ${article.pubDate}
URL: ${article.link}
---`
    ).join('\n\n')

    const { output, usage } = await generateText({
      model: 'openai/gpt-4o-mini',
      system: SYSTEM_PROMPT,
      output: Output.object({
        schema: impartialArticleSchema,
      }),
      messages: [
        {
          role: 'user',
          content: `Analiza los siguientes ${articles.length} articulos sobre el mismo tema y genera UNA nota imparcial:

${formattedArticles}

Genera la nota imparcial siguiendo estrictamente las reglas editoriales.`
        }
      ],
    })

    // Build the response
    const processedArticle = {
      ...output,
      id: crypto.randomUUID(),
      slug: generateSlug(output?.title || ''),
      sources: articles.map((article, index) => ({
        id: `src-${index}`,
        name: article.source,
        url: article.link,
        publishedAt: article.pubDate,
        title: article.title,
        snippet: article.description.slice(0, 150) + '...'
      })),
      sourceCount: articles.length,
      articleCount: articles.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: determineStatus(output?.facts || [])
    }

    return NextResponse.json({
      success: true,
      article: processedArticle,
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens
      }
    })

  } catch (error) {
    console.error('AI processing error:', error)
    return NextResponse.json(
      { error: 'Error al procesar los articulos con IA' },
      { status: 500 }
    )
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

function determineStatus(facts: Array<{ status: string }>): 'confirmed' | 'developing' | 'disputed' {
  const hasDisputed = facts.some(f => f.status === 'disputed')
  if (hasDisputed) return 'disputed'
  
  const hasDeveloping = facts.some(f => f.status === 'developing' || f.status === 'reported')
  if (hasDeveloping) return 'developing'
  
  return 'confirmed'
}
