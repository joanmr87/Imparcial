import { NextResponse } from "next/server"
import { getPublishedClickbaitEdition } from "@/lib/clickbait"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const edition = await getPublishedClickbaitEdition()
    return NextResponse.json(edition)
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        generatedAt: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    )
  }
}
