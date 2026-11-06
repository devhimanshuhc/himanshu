import { getCollection, type CollectionEntry } from "astro:content"

export type Post = CollectionEntry<"blog">

/** Published posts, newest first. Drafts show in dev only. */
export async function getPosts() {
  const posts = await getCollection("blog", (p) => import.meta.env.DEV || !p.data.draft)
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

/** Minutes to read at ~230 wpm, ignoring code fences and component tags. */
export function readingTime(body = "") {
  const prose = body.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]+>/g, " ")
  const words = prose.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 230))
}

export const formatDate = (d: Date, withYear = true) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) })

/** Posts sharing the most tags with `post`, excluding itself. */
export function related(post: Post, all: Post[], n = 2) {
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, score: p.data.tags.filter((t) => post.data.tags.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.data.date.getTime() - a.p.data.date.getTime())
    .slice(0, n)
    .map((x) => x.p)
}
