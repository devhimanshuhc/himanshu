import { getCollection, type CollectionEntry } from "astro:content"

export type Project = CollectionEntry<"projects">

/** Published projects in display order. Drafts show in dev only. */
export async function getProjects() {
  const projects = await getCollection("projects", (p) => import.meta.env.DEV || !p.data.draft)
  return projects.sort((a, b) => a.data.order - b.data.order)
}

/** Hostname without "www.", for link labels. */
export const host = (url: string) => new URL(url).hostname.replace(/^www\./, "")
