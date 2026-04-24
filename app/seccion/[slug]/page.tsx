import { notFound } from "next/navigation"
import { HomepageView } from "@/components/homepage-view"
import { HOME_SECTION_ORDER, normalizeSectionSlug } from "@/lib/news-categories"

export const revalidate = 900
export const dynamicParams = false

interface SectionPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return HOME_SECTION_ORDER.map(section => ({ slug: section.slug }))
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { slug } = await params
  const activeSection = normalizeSectionSlug(slug)

  if (!activeSection) {
    notFound()
  }

  return <HomepageView activeSection={activeSection} />
}
