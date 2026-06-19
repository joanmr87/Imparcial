import { HomepageView } from "@/components/homepage-view"

export const revalidate = 900
export const dynamic = "force-dynamic"
// On a cold cache the page may fetch live feeds as fallback; Fluid Compute
// allows up to 300s, so give it room instead of timing out at 60s (504).
export const maxDuration = 300

export default function HomePage() {
  return <HomepageView enableLegacySectionRedirect />
}
