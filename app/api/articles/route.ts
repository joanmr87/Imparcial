import { getArticles } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const articles = await getArticles();
    return Response.json({ articles });
  } catch (error) {
    console.error("[v0] Error fetching articles:", error);
    return Response.json(
      {
        error: "Failed to fetch articles",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
