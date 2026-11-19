import { createHash, timingSafeEqual } from "node:crypto"
import type { APIRoute } from "astro"

import { getWhereabouts, hasStore, placeFor, setWhereabouts, type Whereabouts } from "@/lib/location"

export const prerender = false

const TOKEN = import.meta.env.LOCATION_TOKEN

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } })

// compare digests so the check takes the same time whatever the input length
const sameSecret = (given: string, expected: string) =>
  timingSafeEqual(createHash("sha256").update(given).digest(), createHash("sha256").update(expected).digest())

/** a short, printable place name, or null */
const clean = (v: unknown) => {
  if (typeof v !== "string") return null
  const s = v.replace(/[\p{C}]/gu, "").trim().slice(0, 60)
  return s || null
}

/**
 * The latest place, for the hero. Cached at the edge for a minute so a new check-in shows
 * up quickly; an empty answer is never cached, or it would hide the first check-in.
 */
export const GET: APIRoute = async () => {
  const where = hasStore() ? await getWhereabouts() : null
  if (!where) return json(null, 200, { "Cache-Control": "no-store" })
  // only city and country are public; drop any area stored by an older version
  const { city, country, updatedAt } = where
  return json({ city, country, updatedAt }, 200, { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60" })
}

/**
 * Called by the iPhone Shortcuts automation with `Authorization: Bearer <LOCATION_TOKEN>` and
 * either `{ "lat": 30.3, "lon": 78.0 }` (looked up, then dropped) or `{ "city": "...", "area": "...", "country": "..." }`.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!TOKEN || !hasStore()) return json({ error: "location updates are not configured" }, 503)
  const auth = request.headers.get("authorization") ?? ""
  if (!auth.startsWith("Bearer ") || !sameSecret(auth.slice(7), TOKEN)) return json({ error: "unauthorized" }, 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: "body must be JSON" }, 400)
  }

  // Shortcuts can send numbers as strings
  const lat = Number(body.lat)
  const lon = Number(body.lon)
  let place: Omit<Whereabouts, "updatedAt"> | null = null
  if (body.lat != null && body.lon != null) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return json({ error: "lat/lon out of range" }, 400)
    }
    place = await placeFor(lat, lon).catch(() => null)
    if (!place) return json({ error: "could not look up that place" }, 502)
  } else {
    const city = clean(body.city)
    if (!city) return json({ error: "send lat and lon, or a city" }, 400)
    place = { area: clean(body.area), city, country: clean(body.country) }
  }

  // the hero shows city and country only, so the neighbourhood is never kept
  const where: Whereabouts = { ...place, area: null, updatedAt: new Date().toISOString() }
  await setWhereabouts(where)
  return json(where)
}
