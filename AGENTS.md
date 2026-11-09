# Agent Guidelines for Portfolio Project

This document provides instructions and guidelines for AI agents operating within this codebase.

## 1. Project Overview

- **Framework:** [Astro v5](https://astro.build/) with [React v19](https://react.dev/).
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with [Shadcn UI](https://ui.shadcn.com/) patterns.
- **Language:** TypeScript (Strict Mode).
- **Package Manager:** `pnpm`.

## 2. Build, Lint, and Test Commands

### Development
- **Start Dev Server:**
  ```bash
  pnpm run dev
  ```

- **Build for Production:**
  ```bash
  pnpm run build
  ```

- **Preview Production Build:**
  ```bash
  pnpm run preview
  ```

### Verification
- **Type Check:**
  Since there is no dedicated script, use the `astro` CLI directly:
  ```bash
  pnpm exec astro check
  ```

- **Linting:**
  There are no explicit lint scripts configured. Follow existing code style.

- **Testing:**
  There is currently **no test suite** (Jest/Vitest) configured.
  - Do not attempt to run `npm test` or `pnpm test`.
  - If asked to create tests, verify the desired test runner with the user first.

## 3. Code Style & Conventions

### General
- **Indentation:** 2 spaces.
- **Semicolons:** Avoid semicolons in TS/TSX files (except where syntactically required).
- **Quotes:** Use double quotes `"` for strings and imports.

### TypeScript / React
- **Imports:**
  - Use the `@/` alias for imports from `src/` (e.g., `@/lib/utils`, `@/components/ui/button`).
  - Use `import * as React from "react"` for React imports.
  - Group imports: External dependencies first, then internal alias imports, then relative imports.
- **Components:**
  - Use **Named Exports** for components (e.g., `export function Button`).
  - Use Functional Components with Hooks.
  - Props interfaces should be defined or intersected inline (see `src/components/ui/button.tsx`).
- **Naming:**
  - Components: PascalCase (e.g., `Hero.astro`, `SmoothScroller.tsx`).
  - Utilities/Functions: camelCase (e.g., `cn`, `getThemePreference`).
  - Files:
    - Astro/React Components: PascalCase.
    - Utilities/Configs: camelCase.

### Styling (Tailwind CSS)
- Use **Tailwind CSS v4** utility classes.
- Use the `cn()` utility (from `@/lib/utils`) for conditional class merging.
- Use `cva` (class-variance-authority) for defining component variants (Shadcn pattern).
- Support Dark Mode via the `dark:` prefix (system uses `dark` class on `<html>`).
- Use CSS variables for theme values (defined in `src/styles/global.css` or arbitrary values).

### Astro Specifics
- Place component logic in the Frontmatter fence (`---`).
- Use `client:*` directives sparingly, only when interactivity is required (e.g., `client:load`, `client:only`).
- Keep Astro pages in `src/pages/`.

## 4. Project Structure

- `src/components/`: Reusable UI components.
  - `ui/`: Primitives (Buttons, Cards, etc.) following Shadcn UI.
- `src/layouts/`: Astro layouts (e.g., `Site.astro`).
- `src/lib/`: Utilities (`utils.ts`) and data (`content.ts`).
- `src/pages/`: Route definitions (`index.astro`).
- `src/styles/`: Global styles (`global.css`).
- `public/`: Static assets.

## 5. Error Handling
- Use specific error types where possible.
- In UI components, handle missing props gracefully or use sensible defaults.

## 6. Visual Design System

**Source of truth: [`DESIGN.md`](./DESIGN.md)** ("paper + void", built in the
[awesome-design-md](https://github.com/voltagent/awesome-design-md) format; the Vercel reference
file lives in `docs/design/vercel.DESIGN.md`). Read it before any UI change.

### Core Tokens (`src/styles/global.css`)
- **Paper** page (`--background: #edeae3`, ink `#141414`), single **void** dark surface via the
  `.void` class (flips the tokens for its children), one accent `--brand` (amber, 3D + tiny dots only).
- **Fonts:** Geist (`font-sans`), Geist Mono (`font-mono`, `.caption` for eyebrows/labels),
  Instrument Serif italic (`.accent`, one word per headline). `font-inter` / `font-zilla-slab`
  are legacy aliases to Geist.
- **Layout vars:** `--frame` (12px / 24px paper margin), `--nav-h` (56px / 72px).

### Layout Patterns
- Sections sit inside `mx-[var(--frame)]` with a `border-t border-foreground/80` rule and a
  12-col grid: `(label)` caption in cols 1–3, content in 4–12.
- Work / experience are index rows separated by hairlines — no cards.

### Motion (`src/scripts/motion.ts`)
- Lenis + GSAP ScrollTrigger, driven by data attributes: `data-split="lines"` (masked line
  reveal), `data-scrub` (word-by-word opacity), `data-fade`, `data-parallax`, `data-hero*`.
- Hero explorer is split for performance: `ProjectExplorer.tsx` is the server-rendered shell
  (title, ruler, side panel; no three.js), and `ExplorerScene.tsx` holds all R3F/three code and is
  `React.lazy`-loaded once the page is idle. Shared state/types live in `src/lib/explorer.ts`.
  Scroll flies a camera between per-project point-cloud models from `src/lib/sculptures.ts`;
  in-canvas components read state via small stores (not props) so `<Canvas>` never re-renders.
  `SculptureStage` (in `ExplorerScene.tsx`) is the single-object version used on `/hire`.
- Fonts are self-hosted via `@fontsource/*` (no Google Fonts request). Don't add `motion`/framer
  back for small effects — progress bar and counters are GSAP in `motion.ts`.
  Everything respects `prefers-reduced-motion`.
