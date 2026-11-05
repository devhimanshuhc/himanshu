// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

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

  integrations: [react()],
  adapter: vercel(),
  redirects: {
    "/cv": "https://drive.google.com/file/d/1j7_bh8uG6rYlVssZpsvVDMz9-WrMLx18/view?usp=drive_link",
    "/pf": "/me"
  }
});