import type { MetadataRoute } from "next"

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://v0-ai-news-verification-ten.vercel.app")
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const routes = [
    "",
    "/metodologia",
    "/seccion/politica",
    "/seccion/economia",
    "/seccion/sociedad",
    "/seccion/deportes",
  ]

  return routes.map(route => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "hourly" : "daily",
    priority: route === "" ? 1 : 0.8,
  }))
}
