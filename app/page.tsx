import { HomepageView } from "@/components/homepage-view"

export const revalidate = 900

export default function HomePage() {
  return <HomepageView enableLegacySectionRedirect />
}
