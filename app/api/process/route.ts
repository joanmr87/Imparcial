import { NextResponse } from "next/server"
import { generateImpartialArticle } from "@/lib/editorial"
import { getEditorialSchemaStatus, upsertGeneratedArticle } from "@/lib/supabase-admin"
import type { SourceArticleInput } from "@/lib/types"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) return String(error.message)
  return "Unknown error"
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      topic?: string
      articles?: SourceArticleInput[]
      persist?: boolean
    }

    const articles = body.articles || []
    if (articles.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 articulos para generar una nota imparcial" },
        { status: 400 }
      )
    }

    const topic = body.topic || articles[0].title
    const { article, usage } = await generateImpartialArticle(topic, articles)

    let persisted = false
    let warning: string | undefined

    if (body.persist) {
      const schema = await getEditorialSchemaStatus()

      if (schema.ready) {
        try {
          await upsertGeneratedArticle(article)
          persisted = true
        } catch (error) {
          warning = `La nota se genero pero no se pudo guardar en Supabase: ${getErrorMessage(error)}`
        }
      } else {
        warning = `No se pudo guardar porque faltan tablas: ${schema.missingTables.join(", ")}`
      }
    }

    return NextResponse.json({
      success: true,
      article,
      persisted,
      warning,
      usage,
    })
  } catch (error) {
    console.error("AI processing error:", error)
    return NextResponse.json(
      {
        error: "Error al procesar los articulos con IA",
        message: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
