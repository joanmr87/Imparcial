import fs from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { getEditorialSchemaStatus, getPipelineSchemaStatus } from "@/lib/supabase-admin"
import { authorizeInternalRequest } from "@/lib/internal-auth"

async function readMigrationSql() {
  const scriptsDir = path.join(process.cwd(), "scripts")
  const files = (await fs.readdir(scriptsDir))
    .filter(file => /^\d+_.*\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right))
  const contents = await Promise.all(
    files.map(async file => {
      const sqlPath = path.join(scriptsDir, file)
      const sql = await fs.readFile(sqlPath, "utf8")
      return `-- ${file}\n${sql.trim()}`
    })
  )

  return contents.join("\n\n")
}

export async function GET(request: Request) {
  const auth = authorizeInternalRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const [editorialSchema, pipelineSchema, sql] = await Promise.all([
      getEditorialSchemaStatus(),
      getPipelineSchemaStatus(),
      readMigrationSql(),
    ])

    return NextResponse.json({
      success: true,
      editorialSchema,
      pipelineSchema,
      sql,
      message: editorialSchema.ready && pipelineSchema.ready
        ? "Supabase schema is ready."
        : "Apply the SQL script in the Supabase SQL editor to enable persistence.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not inspect database schema",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = authorizeInternalRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const [editorialSchema, pipelineSchema, sql] = await Promise.all([
      getEditorialSchemaStatus(),
      getPipelineSchemaStatus(),
      readMigrationSql(),
    ])

    return NextResponse.json(
      {
        success: false,
        message: "Automatic DDL is not available with the current Supabase credentials. Run the SQL script in the Supabase SQL editor.",
        editorialSchema,
        pipelineSchema,
        sql,
      },
      { status: 409 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not inspect database schema",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
