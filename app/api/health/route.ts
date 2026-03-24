import { NextResponse } from "next/server"
import { getEditorialSchemaStatus, getPipelineSchemaStatus } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const [editorialSchema, pipelineSchema] = await Promise.all([
      getEditorialSchemaStatus(),
      getPipelineSchemaStatus(),
    ])

    return NextResponse.json({
      success: true,
      environment: {
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
        openAIModel: process.env.OPENAI_MODEL || "gpt-5-nano",
      },
      editorialSchema,
      pipelineSchema,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
