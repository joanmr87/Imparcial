import { timingSafeEqual } from "node:crypto"

export type InternalAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: "Unauthorized" | "Internal access is not configured" }

function secretsMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)

  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export function authorizeInternalRequest(request: Request): InternalAuthResult {
  const expectedSecret = process.env.CRON_SECRET?.trim()

  if (!expectedSecret) {
    if (process.env.NODE_ENV !== "production") return { ok: true }

    return {
      ok: false,
      status: 503,
      error: "Internal access is not configured",
    }
  }

  const authorization = request.headers.get("authorization")
  const prefix = "Bearer "
  if (!authorization?.startsWith(prefix)) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }

  const receivedSecret = authorization.slice(prefix.length)
  return secretsMatch(receivedSecret, expectedSecret)
    ? { ok: true }
    : { ok: false, status: 401, error: "Unauthorized" }
}
