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
      services: {
        database: editorialSchema.ready && pipelineSchema.ready ? "ready" : "degraded",
        editorial: editorialSchema.ready ? "ready" : "degraded",
        pipeline: pipelineSchema.ready ? "ready" : "degraded",
      },
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
