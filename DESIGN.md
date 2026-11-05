---
name: ansh.life — paper + void
version: 2
references:
  - https://suho.studio/ (full-bleed atmospheric 3D, very little type)
  - https://www.dbydt.space/ (cream paper frame, dark inset viewport, point-cloud 3D, mono labels)
  - docs/design/vercel.DESIGN.md (from VoltAgent/awesome-design-md — hairlines, tight sans, mono eyebrows)
  - https://vercel.com/design/guidelines (interaction, motion, a11y rules)
colors:
  paper: "#EDEAE3"        # page background
  paper-2: "#E4E0D8"      # inset surface, hover rows
  ink: "#141414"          # headings, body, primary CTA
  body: "#55524C"         # secondary text
  mute: "#8A867E"         # captions, fine print
  hairline: "rgba(20,20,20,0.12)"
  void: "#0B0B0C"         # the 3D viewport and dark bands
  void-ink: "#EDEAE3"     # text on void
  amber: "#E8853D"        # the only accent — lives in the 3D and tiny status dots
typography:
  sans: Geist 400/500/600 (never 700)
  mono: Geist Mono 400 — eyebrows, labels, numbers
  serif-accent: Instrument Serif italic — one word per headline, never a full line of body
  display: clamp(3rem, 8vw, 7.5rem) / 0.92 / -0.045em / weight 500
  section: clamp(2.25rem, 5vw, 4.5rem) / 1 / -0.04em / weight 500
  statement: clamp(1.75rem, 3.6vw, 3.25rem) / 1.15 / -0.03em / weight 400
  body: 15–17px / 1.6
  caption-mono: 11–12px / uppercase / 0.08em tracking
rounded:
  none: 0          # frames, images, rows
  pill: 999px      # the single CTA style
spacing:
  base: 4px
  frame: 24px desktop · 12px mobile (paper margin around the void viewport)
  section: 128–192px vertical
---

## Visual theme

Quiet, editorial, engineered. A warm paper page carries everything; a single dark **void**
viewport (inset from the page edges by the paper frame) holds the 3D. Type is small and
confident, never shouting — the 3D object is the spectacle, the typography is the caption.

## Rules

- One accent (amber). It appears in the point cloud and in tiny status dots. No gradients on UI.
- Headlines: Geist 500, tight negative tracking, lowercase voice, with at most one
  Instrument Serif italic word.
- Every eyebrow/label/number is Geist Mono, uppercase, small. Body is never mono.
- Structure comes from 1px hairlines and whitespace — no cards-in-cards, no shadows, no borders
  radius except the pill CTA.
- Lists over grids: work and experience render as index rows (number · title · meta · arrow).

## Motion

- Lenis smooth scroll + GSAP ScrollTrigger. Animate only `transform` and `opacity`.
- Text enters with masked line reveals (expo-out, ~1s). Statement paragraphs light up word by
  word on scroll (scrub).
- The hero is a pinned **project explorer** (after dbydt.space): each project is a sculpture we
  model procedurally (`src/lib/sculptures.ts`) and sample into an amber point cloud, set in a
  fogged space with light shafts and streaks. Scroll flies the camera from object to object; the
  giant title, ruler, bracket frame, "seen" counter and side panel follow the active project.
- Hover on work rows shows a floating preview image that follows the pointer (fine pointers only).
- `prefers-reduced-motion`: no smooth scroll, no reveals, static 3D frame.

## Do / Don't

- Do keep the first viewport to: nav, the giant title, the void viewport and its side panel.
- Do keep hit targets ≥ 24px (44px on touch), visible `:focus-visible` rings, a skip link.
- Don't add marquees, glows or custom cursors. Light shafts live only inside the 3D void, never on paper.
- Don't set headlines in all caps or weights above 600.
