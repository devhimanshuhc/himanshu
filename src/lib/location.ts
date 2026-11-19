import { Redis } from "@upstash/redis"

/**
 * Where I am, as the hero shows it. My iPhone posts its coordinates at 9 am and 9 pm
 * (an iOS Shortcuts automation), /api/location turns them into place names and stores
 * only the names. Coordinates are never saved.
 */
export interface Whereabouts {
  /** neighbourhood or suburb, e.g. "Rajpur" */
  area: string | null
  city: string
  country: string | null
  /** ISO time of the update */
  updatedAt: string
}

const KEY = "whereabouts"

// the Vercel Marketplace integration sets KV_REST_*; a manual Upstash setup sets UPSTASH_REDIS_REST_*
const url = import.meta.env.KV_REST_API_URL ?? import.meta.env.UPSTASH_REDIS_REST_URL
const token = import.meta.env.KV_REST_API_TOKEN ?? import.meta.env.UPSTASH_REDIS_REST_TOKEN
const redis = url && token ? new Redis({ url, token }) : null

// without a store in dev, keep the value in memory so the feature can be tried locally
let memory: Whereabouts | null = null

export const hasStore = () => Boolean(redis) || import.meta.env.DEV

export async function getWhereabouts(): Promise<Whereabouts | null> {
  if (redis) return (await redis.get<Whereabouts>(KEY)) ?? null
  return memory
}

export async function setWhereabouts(value: Whereabouts) {
  if (redis) await redis.set(KEY, value)
  else memory = value
}

type Place = Omit<Whereabouts, "updatedAt">

const tidy = (area: string | null | undefined, city: string, country: string | null | undefined): Place => ({
  area: area && area !== city ? area : null,
  city,
  country: country ?? null,
})

// Mapbox knows Indian localities ("Govind Vihar", "Connaught Place") that OpenStreetMap often lacks
const MAPBOX_TOKEN = import.meta.env.MAPBOX_TOKEN ?? import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN

type MapboxContext = Partial<Record<"neighborhood" | "locality" | "place" | "district" | "country", { name: string }>>

async function mapboxPlace(lat: number, lon: number): Promise<Place | null> {
  const q = new URLSearchParams({ longitude: String(lon), latitude: String(lat), language: "en", limit: "1", access_token: MAPBOX_TOKEN })
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${q}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const data = (await res.json()) as { features?: { properties: { context?: MapboxContext } }[] }
  const c = data.features?.[0]?.properties.context
  const city = c?.place?.name ?? c?.district?.name
  if (!c || !city) return null
  return tidy(c.locality?.name ?? c.neighborhood?.name, city, c.country?.name)
}

interface NominatimAddress {
  neighbourhood?: string
  suburb?: string
  quarter?: string
  city_district?: string
  city?: string
  town?: string
  village?: string
  county?: string
  state_district?: string
  country?: string
}

/** OpenStreetMap's Nominatim: no key, but their policy asks for a real User-Agent. */
async function osmPlace(lat: number, lon: number): Promise<Place | null> {
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "jsonv2", zoom: "16", "accept-language": "en" })
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q}`, {
    headers: { "User-Agent": "ansh.life location widget (https://www.ansh.life)" },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const { address: a } = (await res.json()) as { address?: NominatimAddress }
  const city = a && (a.city ?? a.town ?? a.village ?? a.county ?? a.state_district)
  if (!a || !city) return null
  return tidy(a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district, city, a.country)
}

/** Coordinates to "area, city, country"; Mapbox when there is a token, OpenStreetMap otherwise or on failure. */
export async function placeFor(lat: number, lon: number): Promise<Place | null> {
  const viaMapbox = MAPBOX_TOKEN ? await mapboxPlace(lat, lon).catch(() => null) : null
  return viaMapbox ?? osmPlace(lat, lon)
}
