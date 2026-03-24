import { listPublishedArticles } from "@/lib/articles";

export async function GET() {
  try {
    const result = await listPublishedArticles();
    return Response.json(result);
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
