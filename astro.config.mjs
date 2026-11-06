// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
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
  integrations: [react(), mdx()],
  adapter: vercel(),
  redirects: {
    "/cv": "/resume/",
    "/pf": "/me"
  }
});