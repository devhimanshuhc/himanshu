import { defineCollection, z } from "astro:content"
import { glob } from "astro/loaders"

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    /** one or two sentences shown under the title and on the index */
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
})

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    /** short line after the name, e.g. "The research agent that cites everything" */
    tagline: z.string(),
    /** one or two sentences, shown on the index and under the title */
    summary: z.string(),
    /** context label, e.g. "Open source", "Client project, AI healthcare" */
    kicker: z.string(),
    role: z.string(),
    timeline: z.string(),
    stack: z.array(z.string()),
    links: z.object({ live: z.string().url().optional(), source: z.string().url().optional() }).default({}),
    /** position on the index; lower comes first */
    order: z.number(),
    cover: z.string().optional(),
    tldr: z.object({ problem: z.string(), built: z.string(), outcome: z.string() }),
    stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    /** boxes of the clickable architecture map */
    architecture: z.array(z.object({ name: z.string(), desc: z.string() })).default([]),
    decisions: z.array(z.object({ title: z.string(), problem: z.string(), decision: z.string() })).default([]),
    /** ids of related blog posts */
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
})

export const collections = { blog, projects }
