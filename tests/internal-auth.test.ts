import { afterEach, describe, expect, it } from "vitest"
import { authorizeInternalRequest } from "../lib/internal-auth"

const originalSecret = process.env.CRON_SECRET

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET
  } else {
    process.env.CRON_SECRET = originalSecret
  }
})

describe("internal request authorization", () => {
  it("accepts the configured bearer secret", () => {
    process.env.CRON_SECRET = "test-secret"

    const result = authorizeInternalRequest(new Request("https://example.com", {
      headers: { authorization: "Bearer test-secret" },
    }))

    expect(result).toEqual({ ok: true })
  })

  it("rejects missing and incorrect credentials", () => {
    process.env.CRON_SECRET = "test-secret"

    expect(authorizeInternalRequest(new Request("https://example.com"))).toMatchObject({
      ok: false,
      status: 401,
    })
    expect(authorizeInternalRequest(new Request("https://example.com", {
      headers: { authorization: "Bearer wrong-secret" },
    }))).toMatchObject({
      ok: false,
      status: 401,
    })
  })
})
