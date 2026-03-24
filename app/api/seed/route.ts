import { NextResponse } from "next/server"
import { mockArticles } from "@/lib/mock-data"
import { getEditorialSchemaStatus, upsertGeneratedArticle } from "@/lib/supabase-admin"

export async function POST() {
  try {
    const schema = await getEditorialSchemaStatus()

    if (!schema.ready) {
      return NextResponse.json(
        {
          success: false,
          error: "Schema not ready",
          message: `Missing tables: ${schema.missingTables.join(", ")}`,
        },
        { status: 409 }
      )
    }

    for (const article of mockArticles) {
      await upsertGeneratedArticle(article)
    }

    return NextResponse.json({
      success: true,
      articles: mockArticles.length,
      message: "Mock editorial dataset stored in Supabase.",
    })
  } catch (error) {
    console.error("Error inserting sample data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
