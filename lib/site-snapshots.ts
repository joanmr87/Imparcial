import type { SiteSnapshot } from "./types"
import { getLatestSiteSnapshot, getSiteSnapshot, isTableMissingError, upsertSiteSnapshot } from "./supabase-admin"

const SNAPSHOT_TIMEZONE = "America/Argentina/Buenos_Aires"

export function getArgentinaDateKey(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SNAPSHOT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find(part => part.type === "year")?.value
  const month = parts.find(part => part.type === "month")?.value
  const day = parts.find(part => part.type === "day")?.value

  return [year, month, day].filter(Boolean).join("-")
}

function isSnapshotUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return isTableMissingError(error) || message.includes("Missing Supabase admin credentials")
}

export async function safeGetSiteSnapshot<TPayload>(
  snapshotType: string,
  snapshotDate: string,
  snapshotSlot = "default"
): Promise<SiteSnapshot<TPayload> | null> {
  try {
    return await getSiteSnapshot<TPayload>(snapshotType, snapshotDate, snapshotSlot)
  } catch (error) {
    if (isSnapshotUnavailable(error)) return null
    throw error
  }
}

export async function safeGetLatestSiteSnapshot<TPayload>(
  snapshotType: string,
  snapshotSlot?: string
): Promise<SiteSnapshot<TPayload> | null> {
  try {
    return await getLatestSiteSnapshot<TPayload>(snapshotType, snapshotSlot)
  } catch (error) {
    if (isSnapshotUnavailable(error)) return null
    throw error
  }
}

export async function safeUpsertSiteSnapshot<TPayload>(input: {
  snapshotType: string
  snapshotDate: string
  snapshotSlot?: string
  payload: TPayload
}): Promise<SiteSnapshot<TPayload> | null> {
  try {
    return await upsertSiteSnapshot(input)
  } catch (error) {
    if (isSnapshotUnavailable(error)) return null
    throw error
  }
}
