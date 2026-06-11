import { HomepageView } from "@/components/homepage-view"

export const revalidate = 900
// ISR regeneration may fetch live feeds as fallback; the default function
// duration kills that mid-flight and leaves a stale page being served forever.
export const maxDuration = 60

export default function HomePage() {
  return <HomepageView enableLegacySectionRedirect />
}
