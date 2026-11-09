// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

import vercel from '@astrojs/vercel';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: "https://www.ansh.life",
  // inline the (small, ~11 KB gzipped) stylesheet: saves a render-blocking round trip
  build: {
    inlineStylesheets: "always",
  },
  vite: {
      plugins: [tailwindcss()]
    },

  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
  integrations: [
    react(),
    mdx(),
    sitemap(),
  ],
  adapter: vercel(),
  redirects: {
    "/cv": "/resume/",
    "/pf": "/me",
    // old resume url, kept so previously shared links still resolve
    "/resume-hc.pdf": "/Himanshu_Chauhan_AI_Engineer.pdf",
    "/resume.pdf": "/Himanshu_Chauhan_AI_Engineer.pdf"
  }
});