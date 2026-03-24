import { NextResponse } from "next/server"
import { getClickbaitBusters } from "@/lib/clickbait"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const items = await getClickbaitBusters()
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    )
  }
}
